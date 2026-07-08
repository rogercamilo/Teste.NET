import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logError } from "@/lib/audit-log";
import { MRR_PRICE } from "@/types";
import { PLATFORM_ORG_ID } from "@/lib/tenant-context";

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (user.role !== "super_admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    const agora = new Date();
    const inicio30d = new Date(agora); inicio30d.setDate(agora.getDate() - 30);
    const inicio60d = new Date(agora); inicio60d.setDate(agora.getDate() - 60);

    // Exclui a org de plataforma (host do super_admin) de toda contagem/agregação:
    // ela não é um tenant cliente e inflaria totais, breakdown de plano e MRR.
    const notPlatform = { id: { not: PLATFORM_ORG_ID } };
    // Orgs de cortesia pagam R$ 0 — nunca entram nas agregações de receita
    // (MRR estimado, breakdown de plano pago, ARR, ticket médio, receita em risco).
    const pagante = { ...notPlatform, cortesia: false };

    const [
      totalOrgs,
      orgsAtivas,
      orgsTrials,
      orgsSuspensas,
      orgsCanceladas,
      orgsCortesia,
      totalFormandos,
      totalGruposFormacao,
      totalUsuarios,
      orgsPorPlano,
      crescimento30d,
      crescimentoAnterior30d,
      deletionsPendentes,
      canceladas30d,
      orgsSuspensasPagantes,
      orgsForHistory,
    ] = await Promise.all([
      prisma.organizacao.count({ where: notPlatform }),
      prisma.organizacao.count({ where: { ...notPlatform, status: "ATIVO" } }),
      prisma.organizacao.count({ where: { ...notPlatform, status: "TRIAL" } }),
      prisma.organizacao.count({ where: { ...notPlatform, status: "SUSPENSO" } }),
      prisma.organizacao.count({ where: { ...notPlatform, status: "CANCELADO" } }),
      prisma.organizacao.count({ where: { ...notPlatform, cortesia: true } }),
      prisma.formando.count(),
      prisma.grupoFormacao.count(),
      prisma.usuario.count({ where: { deletedAt: null, perfil: { not: "super_admin" } } }),
      prisma.organizacao.groupBy({ by: ["planoAssinatura"], _count: { id: true }, where: pagante }),
      prisma.organizacao.count({ where: { ...notPlatform, criadoEm: { gte: inicio30d } } }),
      prisma.organizacao.count({ where: { ...notPlatform, criadoEm: { gte: inicio60d, lt: inicio30d } } }),
      prisma.deletionRequest.count({ where: { status: "pendente" } }),
      prisma.organizacao.count({ where: { ...notPlatform, canceladoEm: { gte: inicio30d } } }),
      prisma.organizacao.findMany({
        where: { ...pagante, status: "SUSPENSO", stripeSubscriptionId: { not: null } },
        select: { id: true, nome: true, planoAssinatura: true },
      }),
      prisma.organizacao.findMany({
        where: pagante,
        select: { criadoEm: true, canceladoEm: true, planoAssinatura: true },
      }),
    ]);

    // MRR real via Stripe — pagina todos os resultados (has_more loop)
    let mrrReal: number | null = null;
    if (stripe) {
      try {
        type StripeSub = Awaited<ReturnType<typeof stripe.subscriptions.list>>["data"][number];
        const allSubs: StripeSub[] = [];
        let hasMore = true;
        let startingAfter: string | undefined;
        while (hasMore) {
          const page = await stripe.subscriptions.list({
            status: "active",
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          });
          allSubs.push(...page.data);
          hasMore = page.has_more;
          if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id;
        }
        mrrReal = allSubs.reduce((total, sub) => {
          return total + sub.items.data.reduce((s, item) => {
            const amount = item.price.unit_amount ?? 0;
            const qty = item.quantity ?? 1;
            const interval = item.price.recurring?.interval;
            const intervalCount = item.price.recurring?.interval_count ?? 1;
            const monthlyAmount =
              interval === "year"
                ? (amount * qty) / (12 * intervalCount)
                : interval === "week"
                  ? (amount * qty * 4) / intervalCount
                  : (amount * qty) / intervalCount;
            return s + monthlyAmount;
          }, 0);
        }, 0) / 100;
      } catch {
        // Stripe configurado mas chamada falhou — manter null
      }
    }

    const planoBreakdown = orgsPorPlano.reduce(
      (acc, g) => ({ ...acc, [g.planoAssinatura]: g._count.id }),
      {} as Record<string, number>
    );

    const mrrEstimado = orgsPorPlano.reduce((total, g) => {
      return total + (MRR_PRICE[g.planoAssinatura] ?? 0) * g._count.id;
    }, 0);

    const mrrHistory = Array.from({ length: 6 }, (_, i) => {
      const offset = 5 - i;
      const startOfMonth = new Date(agora.getFullYear(), agora.getMonth() - offset, 1);
      const endOfMonth = new Date(agora.getFullYear(), agora.getMonth() - offset + 1, 0, 23, 59, 59, 999);
      const mrr = orgsForHistory.reduce((sum, org) => {
        const wasActive = org.criadoEm <= endOfMonth && (!org.canceladoEm || org.canceladoEm >= startOfMonth);
        return sum + (wasActive ? (MRR_PRICE[org.planoAssinatura] ?? 0) : 0);
      }, 0);
      return { month: startOfMonth.toLocaleString("pt-BR", { month: "short" }), mrr };
    });

    const crescimentoPercent =
      crescimentoAnterior30d === 0
        ? crescimento30d > 0 ? 100 : 0
        : Math.round(((crescimento30d - crescimentoAnterior30d) / crescimentoAnterior30d) * 100);

    const orgsPagantes = (planoBreakdown["BASICO"] ?? 0) + (planoBreakdown["INTERMEDIARIO"] ?? 0)
      + (planoBreakdown["AVANCADO"] ?? 0) + (planoBreakdown["PERSONALIZADO"] ?? 0);
    const arr = mrrEstimado * 12;
    const ticketMedio = orgsPagantes > 0 ? Math.round(mrrEstimado / orgsPagantes) : 0;
    // churn approximation: canceladas30d / (orgsAtivas + canceladas30d)
    const churnBase = orgsAtivas + canceladas30d;
    const churnRate30d = churnBase > 0 ? Math.round((canceladas30d / churnBase) * 100 * 10) / 10 : 0;

    return NextResponse.json({
      totalOrgs,
      orgsAtivas,
      orgsTrials,
      orgsSuspensas,
      orgsCanceladas,
      orgsCortesia,
      totalFormandos,
      totalGruposFormacao,
      totalUsuarios,
      planoBreakdown,
      mrrEstimado,
      mrrReal,
      deletionsPendentes,
      crescimento30d,
      crescimentoAnterior30d,
      crescimentoPercent,
      arr,
      ticketMedio,
      churnRate30d,
      canceladas30d,
      mrrHistory,
      receitaEmRisco: {
        count: orgsSuspensasPagantes.length,
        mrrEmRisco: orgsSuspensasPagantes.reduce((s, o) => s + (MRR_PRICE[o.planoAssinatura] ?? 0), 0),
        orgs: orgsSuspensasPagantes,
      },
    });
  } catch (err) {
    logError("super-admin/metricas GET", err);
    return NextResponse.json({ error: "Falha ao carregar métricas" }, { status: 500 });
  }
}
