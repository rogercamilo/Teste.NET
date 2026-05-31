import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardClient } from "./DashboardClient";
import type { DashboardStats, NivelFormativo, TipoFormacao, StatusFormacao, PerfilUsuario } from "@/types";

async function getDashboardData(
  organizacaoId: string,
  moradaId: string | null = null,
  userId: string | null = null,
): Promise<DashboardStats> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));

  // formador_comunitario: escopo reduzido à morada e às sessões que conduz
  const formandoBase = moradaId ? { organizacaoId, moradaId } : { organizacaoId };
  const agendamentoBase = (userId && moradaId) ? { organizacaoId, formadorId: userId } : { organizacaoId };

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
    prisma.formando.count({ where: formandoBase }),
    prisma.formando.count({ where: { ...formandoBase, ativo: true } }),
    prisma.formando.groupBy({
      by: ["nivelFormativo"],
      where: formandoBase,
      _count: { nivelFormativo: true },
    }),
    prisma.agendamento.count({
      where: { ...agendamentoBase, status: "agendada", dataInicio: { gte: thisMonthStart, lte: thisMonthEnd } },
    }),
    prisma.agendamento.count({
      where: { ...agendamentoBase, status: "realizada", dataInicio: { gte: thisMonthStart, lte: thisMonthEnd } },
    }),
    prisma.agendamento.count({
      where: { ...agendamentoBase, status: "cancelada", dataInicio: { gte: thisMonthStart, lte: thisMonthEnd } },
    }),
    prisma.agendamento.findMany({
      where: { ...agendamentoBase, dataInicio: { gte: sixMonthsAgo } },
      select: { dataInicio: true, status: true },
    }),
    prisma.agendamento.findMany({
      where: { ...agendamentoBase, status: { in: ["agendada", "confirmada"] }, dataInicio: { gte: now } },
      orderBy: { dataInicio: "asc" },
      take: 5,
    }),
  ]);

  // ── Evolução mensal ────────────────────────────────────────────────────────
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
  const evolucaoMensal = months.map(({ yearMonth, label }) => ({ mes: label, ...buckets[yearMonth] }));

  // ── Por nível ──────────────────────────────────────────────────────────────
  const ORDEM: NivelFormativo[] = [
    "pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente",
  ];
  const totalNivel = formandosPorNivel.reduce((s, g) => s + g._count.nivelFormativo, 0);
  const porNivel = ORDEM.map((nivel) => {
    const g = formandosPorNivel.find((x) => x.nivelFormativo === nivel);
    const quantidade = g?._count.nivelFormativo ?? 0;
    return { nivel, quantidade, percentual: totalNivel > 0 ? Math.round((quantidade / totalNivel) * 100) : 0 };
  }).filter((n) => n.quantidade > 0);

  const totalDecididas = realizadasMes + canceladasMes;
  const taxaRealizacao = totalDecididas > 0 ? Math.round((realizadasMes / totalDecididas) * 100) : 0;

  return {
    totalAgendadas: agendadasMes,
    totalRealizadas: realizadasMes,
    totalCanceladas: canceladasMes,
    taxaRealizacao,
    totalFormandos,
    formandosAtivos,
    evolucaoMensal,
    porNivel,
    proximasFormacoes: proximasRaw.map((a) => ({
      id: a.id,
      formacaoId: a.formacaoId,
      formacaoTema: a.formacaoTema,
      nivelFormativo: a.nivelFormativo as NivelFormativo,
      tipoFormacao: a.tipoFormacao as TipoFormacao,
      formadorId: a.formadorId,
      formadorNome: a.formadorNome,
      dataInicio: a.dataInicio.toISOString(),
      dataFim: a.dataFim.toISOString(),
      local: a.local ?? undefined,
      linkOnline: a.linkOnline ?? undefined,
      status: a.status as StatusFormacao,
      participantes: a.participantes,
      observacoes: a.observacoes ?? undefined,
      googleCalendarEventId: a.googleCalendarEventId ?? undefined,
      criadoEm: a.criadoEm.toISOString(),
    })),
  };
}

type SU = { organizacaoId?: string; role?: string; id?: string; moradaId?: string | null };

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) redirect("/login");

  const perfil = (user.role ?? "formador_comunitario") as PerfilUsuario;
  const isFormadorComunitario = perfil === "formador_comunitario";
  const moradaId = isFormadorComunitario ? (user.moradaId ?? null) : null;
  const semMorada = isFormadorComunitario && !moradaId;

  let moradaNome: string | null = null;
  if (moradaId) {
    const morada = await prisma.morada.findUnique({ where: { id: moradaId }, select: { nome: true } });
    moradaNome = morada?.nome ?? null;
  }

  const stats = semMorada
    ? null
    : await getDashboardData(user.organizacaoId, moradaId, user.id ?? null).catch(() => null);

  return <DashboardClient stats={stats} perfil={perfil} moradaNome={moradaNome} semMorada={semMorada} />;
}
