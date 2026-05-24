import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Preços de referência para MRR estimado (R$/mês por organização)
const MRR_PRICE: Record<string, number> = {
  GRATUITO: 0,
  ESSENCIAL: 149,
  PROFISSIONAL: 349,
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
      totalMoradas,
      totalUsuarios,
      orgsPorPlano,
      crescimento30d,
      crescimentoAnterior30d,
      ultimasOrgs,
    ] = await Promise.all([
      prisma.organizacao.count(),
      prisma.organizacao.count({ where: { status: "ATIVO" } }),
      prisma.organizacao.count({ where: { status: "TRIAL" } }),
      prisma.organizacao.count({ where: { status: "SUSPENSO" } }),
      prisma.organizacao.count({ where: { status: "CANCELADO" } }),
      prisma.organizacao.count({ where: { cortesia: true } }),
      prisma.formando.count(),
      prisma.morada.count(),
      prisma.usuario.count({ where: { deletedAt: null } }),
      prisma.organizacao.groupBy({ by: ["planoAssinatura"], _count: { id: true } }),
      prisma.organizacao.count({ where: { criadoEm: { gte: inicio30d } } }),
      prisma.organizacao.count({ where: { criadoEm: { gte: inicio60d, lt: inicio30d } } }),
      prisma.organizacao.findMany({
        orderBy: { criadoEm: "desc" },
        take: 8,
        select: { id: true, nome: true, status: true, planoAssinatura: true, cortesia: true, criadoEm: true },
      }),
    ]);

    const planoBreakdown = orgsPorPlano.reduce(
      (acc, g) => ({ ...acc, [g.planoAssinatura]: g._count.id }),
      {} as Record<string, number>
    );

    const mrrEstimado = orgsPorPlano.reduce((total, g) => {
      return total + (MRR_PRICE[g.planoAssinatura] ?? 0) * g._count.id;
    }, 0);

    const crescimentoPercent =
      crescimentoAnterior30d === 0
        ? crescimento30d > 0 ? 100 : 0
        : Math.round(((crescimento30d - crescimentoAnterior30d) / crescimentoAnterior30d) * 100);

    return NextResponse.json({
      totalOrgs,
      orgsAtivas,
      orgsTrials,
      orgsSuspensas,
      orgsCanceladas,
      orgsCortesia,
      totalFormandos,
      totalMoradas,
      totalUsuarios,
      planoBreakdown,
      mrrEstimado,
      crescimento30d,
      crescimentoAnterior30d,
      crescimentoPercent,
      ultimasOrgs,
    });
  } catch (err) {
    console.error("[super-admin metricas GET]", err);
    return NextResponse.json({ error: "Falha ao carregar métricas" }, { status: 500 });
  }
}
