import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logError } from "@/lib/audit-log";

// Preços de referência para MRR estimado (R$/mês por organização)
const MRR_PRICE: Record<string, number> = {
  GRATUITO:     0,
  BASICO:       97,
  INTERMEDIARIO:197,
  AVANCADO:     397,
  PERSONALIZADO:890,
};

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const agora = new Date();
    const inicio30d = new Date(agora); inicio30d.setDate(agora.getDate() - 30);
    const inicio60d = new Date(agora); inicio60d.setDate(agora.getDate() - 60);

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
      ultimasOrgs,
      deletionsPendentes,
      canceladas30d,
      orgsSuspensasPagantes,
      orgsForHistory,
    ] = await Promise.all([
      prisma.organizacao.count(),
      prisma.organizacao.count({ where: { status: "ATIVO" } }),
      prisma.organizacao.count({ where: { status: "TRIAL" } }),
      prisma.organizacao.count({ where: { status: "SUSPENSO" } }),
      prisma.organizacao.count({ where: { status: "CANCELADO" } }),
      prisma.organizacao.count({ where: { cortesia: true } }),
      prisma.formando.count(),
      prisma.grupoFormacao.count(),
      prisma.usuario.count({ where: { deletedAt: null } }),
      prisma.organizacao.groupBy({ by: ["planoAssinatura"], _count: { id: true } }),
      prisma.organizacao.count({ where: { criadoEm: { gte: inicio30d } } }),
      prisma.organizacao.count({ where: { criadoEm: { gte: inicio60d, lt: inicio30d } } }),
      prisma.organizacao.findMany({
        orderBy: { criadoEm: "desc" },
        take: 8,
        select: { id: true, nome: true, status: true, planoAssinatura: true, cortesia: true, criadoEm: true },
      }),
      prisma.deletionRequest.count({ where: { status: "pendente" } }),
      prisma.organizacao.count({ where: { canceladoEm: { gte: inicio30d } } }),
      prisma.organizacao.findMany({
        where: { status: "SUSPENSO", stripeSubscriptionId: { not: null } },
        select: { id: true, nome: true, planoAssinatura: true },
      }),
      prisma.organizacao.findMany({
        select: { criadoEm: true, canceladoEm: true, planoAssinatura: true },
      }),
    ]);

    // MRR real via Stripe (graceful fallback se Stripe não estiver configurado)
    let mrrReal: number | null = null;
    if (stripe) {
      try {
        const subs = await stripe.subscriptions.list({ status: "active", limit: 100 });
        mrrReal = subs.data.reduce((total, sub) => {
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
      ultimasOrgs,
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
