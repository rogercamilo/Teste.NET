import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DashboardClient } from "./DashboardClient";
import { toAgendamento } from "@/lib/converters";
import { SessionUser } from "@/lib/auth-helpers";
import type { DashboardStats, NivelFormativo, NotaAdesao, PerfilUsuario } from "@/types";

const PERFIL_FC = "formador_comunitario" as const;

async function getDashboardData(
  organizacaoId: string,
  grupoFormacaoId: string | null = null,
  userId: string | null = null,
  perfil: PerfilUsuario = "formador_comunitario",
): Promise<DashboardStats> {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const sixMonthsAgo = startOfMonth(subMonths(now, 5));

  // formador_comunitario: escopo reduzido à morada e às sessões que conduz
  const formandoBase = grupoFormacaoId
    ? { organizacaoId, grupoFormacaoId, deletedAt: null }
    : { organizacaoId, deletedAt: null };
  const agendamentoBase = (userId && grupoFormacaoId) ? { organizacaoId, formadorId: userId } : { organizacaoId };

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

  const baseStats: DashboardStats = {
    totalAgendadas: agendadasMes,
    totalRealizadas: realizadasMes,
    totalCanceladas: canceladasMes,
    taxaRealizacao,
    totalFormandos,
    formandosAtivos,
    evolucaoMensal,
    porNivel,
    proximasFormacoes: proximasRaw.map(toAgendamento),
  };

  // ── FC: presença e acompanhamento ─────────────────────────────────────────
  if (perfil === PERFIL_FC && grupoFormacaoId) {
    const threeMonthsAgo = subMonths(now, 3);
    const [formandosDaMorada, presencas90d, avaliacoesPerspectiva] = await Promise.all([
      prisma.formando.findMany({
        where: { organizacaoId, grupoFormacaoId, ativo: true },
        select: { id: true, nome: true, nivelFormativo: true },
        orderBy: { nome: "asc" },
      }),
      prisma.presencaFormacao.findMany({
        where: { organizacaoId, data: { gte: threeMonthsAgo }, formando: { grupoFormacaoId } },
        select: { formandoId: true, presente: true },
      }),
      // Última avaliação de adesão por formando × perspectiva
      prisma.eventoFormando.findMany({
        where: {
          organizacaoId,
          tipo: "avaliacao-adesao",
          perspectiva: { not: null },
          formando: { grupoFormacaoId },
        },
        select: { formandoId: true, perspectiva: true, notaAdesao: true, criadoEm: true },
        orderBy: { criadoEm: "desc" },
      }),
    ]);

    // Monta mapa: formandoId → { humana, espiritual, comunitaria } com nota mais recente
    type PerspectivaMap = { humana?: NotaAdesao; espiritual?: NotaAdesao; comunitaria?: NotaAdesao };
    const perspMap = new Map<string, PerspectivaMap>();
    for (const ev of avaliacoesPerspectiva) {
      if (!ev.perspectiva || !ev.notaAdesao) continue;
      const entry: PerspectivaMap = perspMap.get(ev.formandoId) ?? {};
      const key = ev.perspectiva as keyof PerspectivaMap;
      if (!entry[key]) entry[key] = ev.notaAdesao as NotaAdesao;
      perspMap.set(ev.formandoId, entry);
    }

    const presMap = new Map<string, { total: number; com: number }>();
    for (const p of presencas90d) {
      const e = presMap.get(p.formandoId) ?? { total: 0, com: 0 };
      e.total++;
      if (p.presente) e.com++;
      presMap.set(p.formandoId, e);
    }

    const formandosPresenca = formandosDaMorada.map((f) => {
      const p = presMap.get(f.id);
      const totalSessoes = p?.total ?? 0;
      const sessoesCom = p?.com ?? 0;
      return {
        id: f.id, nome: f.nome,
        nivelFormativo: f.nivelFormativo as NivelFormativo,
        totalSessoes, sessoesCom,
        taxa: totalSessoes > 0 ? Math.round((sessoesCom / totalSessoes) * 100) : -1,
        perspectivas: perspMap.get(f.id) ?? {},
      };
    });

    const totalS = presencas90d.length;
    const totalP = presencas90d.filter((p) => p.presente).length;

    return {
      ...baseStats,
      taxaPresencaGrupoFormacao: totalS > 0 ? Math.round((totalP / totalS) * 100) : null,
      formandosPresenca,
    };
  }

  // ── FG/Admin: visão estratégica ───────────────────────────────────────────
  if (perfil === "formador_geral" || perfil === "administrador") {
    const threeMonthsAgo = subMonths(now, 3);
    const [moradasData, formandosAtivosGrp, totalPlanosAtivos, gruposFormacaoSemPlano, gruposFormacaoSemGrade, gruposFormacaoComGradeExpirada, fcsSemGrupoFormacao, presencasPorGrupoFormacao] =
      await Promise.all([
        prisma.grupoFormacao.findMany({
          where: { organizacaoId, ativo: true },
          select: {
            id: true, nome: true, tipo: true, nivelFormativo: true, planoId: true, gradeId: true,
            vigenciaFim: true,
            formador: { select: { nome: true } },
            _count: { select: { formandos: true } },
          },
          orderBy: { nome: "asc" },
        }),
        prisma.formando.groupBy({
          by: ["grupoFormacaoId"],
          where: { organizacaoId, ativo: true, grupoFormacaoId: { not: null } },
          _count: { id: true },
        }),
        prisma.planoFormativo.count({
          where: { OR: [{ organizacaoId }, { isGlobal: true }], status: "ativo" },
        }),
        prisma.grupoFormacao.count({ where: { organizacaoId, ativo: true, planoId: null } }),
        prisma.grupoFormacao.count({ where: { organizacaoId, ativo: true, gradeId: null } }),
        // Moradas que têm grade mas a etapa foi encerrada (vigenciaFim definida)
        prisma.grupoFormacao.count({ where: { organizacaoId, ativo: true, gradeId: { not: null }, vigenciaFim: { not: null } } }),
        prisma.usuario.count({
          where: { organizacaoId, perfil: "formador_comunitario", ativo: true, grupoFormacaoId: null },
        }),
        // Taxa de presença por morada nos últimos 90 dias (via formando)
        prisma.presencaFormacao.findMany({
          where: { organizacaoId, data: { gte: threeMonthsAgo } },
          select: { presente: true, formando: { select: { grupoFormacaoId: true } } },
        }),
      ]);

    const ativosMap = new Map(formandosAtivosGrp.map((g) => [g.grupoFormacaoId!, g._count.id]));

    // Agrega presença por morada em memória
    const presencaGrupoFormacaoMap = new Map<string, { total: number; presentes: number }>();
    for (const p of presencasPorGrupoFormacao) {
      const mid = p.formando?.grupoFormacaoId;
      if (!mid) continue;
      const e = presencaGrupoFormacaoMap.get(mid) ?? { total: 0, presentes: 0 };
      e.total++;
      if (p.presente) e.presentes++;
      presencaGrupoFormacaoMap.set(mid, e);
    }

    return {
      ...baseStats,
      totalGruposFormacao: moradasData.length,
      totalPlanosAtivos,
      gruposFormacaoSemPlano,
      gruposFormacaoSemGrade,
      gruposFormacaoComGradeExpirada,
      fcsSemGrupoFormacao,
      gruposFormacaoResumo: moradasData.map((m) => {
        const pres = presencaGrupoFormacaoMap.get(m.id);
        const taxaPresenca = pres && pres.total > 0
          ? Math.round((pres.presentes / pres.total) * 100)
          : null;
        return {
          id: m.id, nome: m.nome,
          tipo: m.tipo as import("@/types").TipoGrupoFormacao,
          nivelFormativo: m.nivelFormativo ? m.nivelFormativo as NivelFormativo : undefined,
          totalFormandos: m._count.formandos,
          formandosAtivos: ativosMap.get(m.id) ?? 0,
          temPlano: !!m.planoId,
          temGrade: !!m.gradeId,
          formadorNome: m.formador?.nome,
          taxaPresenca,
          // grade vigente = tem grade E etapa não foi encerrada (vigenciaFim nula)
          gradeVigente: !!m.gradeId && !m.vigenciaFim,
        };
      }),
    };
  }

  return baseStats;
}

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) redirect("/login");

  const perfil = (user.role ?? "formador_comunitario") as PerfilUsuario;
  const isFormadorComunitario = perfil === "formador_comunitario";
  const grupoFormacaoId = isFormadorComunitario ? (user.grupoFormacaoId ?? null) : null;
  const semMorada = isFormadorComunitario && !grupoFormacaoId;

  const [grupoFormacao, stats] = await Promise.all([
    grupoFormacaoId
      ? prisma.grupoFormacao.findUnique({ where: { id: grupoFormacaoId, organizacaoId: user.organizacaoId }, select: { nome: true } })
      : Promise.resolve(null),
    semMorada
      ? Promise.resolve(null)
      : getDashboardData(user.organizacaoId, grupoFormacaoId, user.id ?? null, perfil).catch(() => null),
  ]);
  const grupoFormacaoNome = grupoFormacao?.nome ?? null;

  return <DashboardClient stats={stats} perfil={perfil} grupoFormacaoNome={grupoFormacaoNome} semMorada={semMorada} />;
}
