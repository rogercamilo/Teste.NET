import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SU = { role?: string };

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const [
      totalOrgs,
      orgsAtivas,
      orgsTrials,
      orgsSuspensas,
      totalFormandos,
      totalMoradas,
      totalUsuarios,
      orgsPorPlano,
      ultimasOrgs,
    ] = await Promise.all([
      prisma.organizacao.count(),
      prisma.organizacao.count({ where: { status: "ATIVO" } }),
      prisma.organizacao.count({ where: { status: "TRIAL" } }),
      prisma.organizacao.count({ where: { status: "SUSPENSO" } }),
      prisma.formando.count(),
      prisma.morada.count(),
      prisma.usuario.count(),
      prisma.organizacao.groupBy({ by: ["planoAssinatura"], _count: { id: true } }),
      prisma.organizacao.findMany({
        orderBy: { criadoEm: "desc" },
        take: 5,
        select: { id: true, nome: true, status: true, planoAssinatura: true, criadoEm: true },
      }),
    ]);

    const planoBreakdown = orgsPorPlano.reduce(
      (acc, g) => ({ ...acc, [g.planoAssinatura]: g._count.id }),
      {} as Record<string, number>
    );

    return NextResponse.json({
      totalOrgs, orgsAtivas, orgsTrials, orgsSuspensas,
      totalFormandos, totalMoradas, totalUsuarios,
      planoBreakdown, ultimasOrgs,
    });
  } catch (err) {
    console.error("[super-admin metricas GET]", err);
    return NextResponse.json({ error: "Falha ao carregar métricas" }, { status: 500 });
  }
}
