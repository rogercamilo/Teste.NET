import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DashboardStats, NivelFormativo, Agendamento } from "@/types";

import { toAgendamento as toAg } from "@/lib/converters";
import { SessionUser as SU } from "@/lib/auth-helpers";

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const orgId = user.organizacaoId;
  const now = new Date();

  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));

  const [
    totalFormandos,
    formandosAtivos,
    formandosPorNivel,
    agendadasMes,
    realizadasMes,
    canceladasMes,
    agendamentosEvolucao,
    proximasRaw,
  ] = await Promise.all([
    prisma.formando.count({ where: { organizacaoId: orgId, deletedAt: null } }),
    prisma.formando.count({ where: { organizacaoId: orgId, ativo: true, deletedAt: null } }),
    prisma.formando.groupBy({
      by: ["nivelFormativo"],
      where: { organizacaoId: orgId, deletedAt: null },
      _count: { nivelFormativo: true },
    }),
    prisma.agendamento.count({
      where: { organizacaoId: orgId, status: "agendada", dataInicio: { gte: thisMonthStart, lte: thisMonthEnd } },
    }),
    prisma.agendamento.count({
      where: { organizacaoId: orgId, status: "realizada", dataInicio: { gte: thisMonthStart, lte: thisMonthEnd } },
    }),
    prisma.agendamento.count({
      where: { organizacaoId: orgId, status: "cancelada", dataInicio: { gte: thisMonthStart, lte: thisMonthEnd } },
    }),
    prisma.agendamento.findMany({
      where: { organizacaoId: orgId, dataInicio: { gte: sixMonthsAgo } },
      select: { dataInicio: true, status: true },
      orderBy: { dataInicio: "asc" },
    }),
    prisma.agendamento.findMany({
      where: { organizacaoId: orgId, status: { in: ["agendada", "confirmada"] }, dataInicio: { gte: now } },
      orderBy: { dataInicio: "asc" },
      take: 5,
    }),
  ]);

  // ── Evolução mensal (last 6 months) ──────────────────────────────────────
  const months: { yearMonth: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i);
    const lbl = format(m, "MMM", { locale: ptBR });
    months.push({
      yearMonth: format(m, "yyyy-MM"),
      label: lbl.charAt(0).toUpperCase() + lbl.slice(1),
    });
  }

  const buckets: Record<string, { agendadas: number; realizadas: number }> = {};
  for (const { yearMonth } of months) buckets[yearMonth] = { agendadas: 0, realizadas: 0 };

  for (const ag of agendamentosEvolucao) {
    const ym = format(ag.dataInicio, "yyyy-MM");
    if (!buckets[ym]) continue;
    if (ag.status === "agendada" || ag.status === "confirmada") buckets[ym].agendadas++;
    else if (ag.status === "realizada") buckets[ym].realizadas++;
  }

  const evolucaoMensal = months.map(({ yearMonth, label }) => ({
    mes: label,
    ...buckets[yearMonth],
  }));

  // ── Por nível ─────────────────────────────────────────────────────────────
  const totalNivel = formandosPorNivel.reduce((s, g) => s + g._count.nivelFormativo, 0);
  const ORDEM: NivelFormativo[] = ["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"];
  const porNivel = ORDEM.map((nivel) => {
    const g = formandosPorNivel.find((x) => x.nivelFormativo === nivel);
    const quantidade = g?._count.nivelFormativo ?? 0;
    return {
      nivel,
      quantidade,
      percentual: totalNivel > 0 ? Math.round((quantidade / totalNivel) * 100) : 0,
    };
  }).filter((n) => n.quantidade > 0);

  // ── Taxa de realização ────────────────────────────────────────────────────
  const totalDecididas = realizadasMes + canceladasMes;
  const taxaRealizacao = totalDecididas > 0 ? Math.round((realizadasMes / totalDecididas) * 100) : 0;

  const stats: DashboardStats = {
    totalAgendadas: agendadasMes,
    totalRealizadas: realizadasMes,
    totalCanceladas: canceladasMes,
    taxaRealizacao,
    totalFormandos,
    formandosAtivos,
    evolucaoMensal,
    porNivel,
    proximasFormacoes: proximasRaw.map(toAg),
  };

  return NextResponse.json(stats);
}
