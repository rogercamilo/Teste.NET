/**
 * Carregador de relatórios (server-only) — ponte entre o banco e os builders puros.
 *
 * Fonte ÚNICA de dados: tanto a página (`/relatorios/[slug]`) quanto a API de
 * exportação chamam `carregarRelatorio` e recebem o MESMO resultado tipado, evitando
 * divergência entre a tela e o PDF/CSV. Toda a leitura é escopada por organização e
 * papel; relatórios de morada resolvem a morada do FC ou a selecionada pela gestão.
 */

import "server-only";
import { subDays, subMonths, startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import {
  NIVEL_FORMATIVO_LABELS,
  type NivelFormativo,
  type NotaAdesao,
  type PerfilUsuario,
  type PerspectivaFormativa,
  type ProgressoEtapa,
} from "@/types";
import { getRelatorioDef, normalizarPeriodo, type RelatorioSlug } from "./catalogo";
import {
  montarRelatorioAcompanhamentoMorada,
  type Pareceres,
  type RelatorioAcompanhamentoMorada,
} from "./acompanhamento-morada-relatorio";
import { montarRelatorioFrequencia, type RelatorioFrequencia } from "./frequencia-relatorio";
import { montarRelatorioConsolidado, type RelatorioConsolidado } from "./consolidado-relatorio";
import { montarRelatorioJornada, type RelatorioJornada } from "./jornada-relatorio";
import { montarRelatorioCobertura, type RelatorioCobertura } from "./cobertura-relatorio";
import { montarRelatorioExecutivo, type RelatorioExecutivo } from "./executivo-relatorio";

const GESTAO: PerfilUsuario[] = ["formador_geral", "fundador", "administrador"];

export interface CarregarCtx {
  organizacaoId: string;
  perfil: PerfilUsuario;
  grupoFormacaoId: string | null;
  userId: string;
  moradaId?: string | null;
  periodoDias: number;
}

export interface RelatorioMeta {
  slug: RelatorioSlug;
  titulo: string;
  orgNome: string;
  periodoDias: number;
  geradoEmISO: string;
  escopo: "morada" | "org";
  moradaNome?: string | null;
  moradasDisponiveis?: { id: string; nome: string }[];
  /** Gestão abriu um relatório de morada sem escolher a morada. */
  precisaSelecionarMorada?: boolean;
  /** FC sem morada vinculada. */
  semMorada?: boolean;
}

export type ResultadoRelatorio =
  | { slug: "acompanhamento-morada"; dados: RelatorioAcompanhamentoMorada }
  | { slug: "frequencia"; dados: RelatorioFrequencia }
  | { slug: "consolidado-moradas"; dados: RelatorioConsolidado }
  | { slug: "jornada-comunidade"; dados: RelatorioJornada }
  | { slug: "cobertura-acompanhamento"; dados: RelatorioCobertura }
  | { slug: "executivo"; dados: RelatorioExecutivo };

export interface RelatorioCarregado {
  meta: RelatorioMeta;
  resultado: ResultadoRelatorio | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

type OrgTermos = {
  nome: string;
  termoPreDiscipulado: string | null;
  termoDiscipulado: string | null;
  termoPrimeirasPromessas: string | null;
  termoFormacaoPermanente: string | null;
  cadenciaAcompanhamentoMeses: number | null;
};

function construirEtapaLabel(org: OrgTermos | null): (n: NivelFormativo) => string {
  const map: Partial<Record<NivelFormativo, string>> = {
    "pre-discipulado": org?.termoPreDiscipulado || undefined,
    discipulado: org?.termoDiscipulado || undefined,
    "primeiras-promessas": org?.termoPrimeirasPromessas || undefined,
    "formacao-permanente": org?.termoFormacaoPermanente || undefined,
  };
  return (n: NivelFormativo) => map[n] || NIVEL_FORMATIVO_LABELS[n] || n;
}

type ProgRow = {
  nivelFormativo: string;
  formacoesComunitariasRealizadas: number;
  retirosComunitariosRealizados: number;
  retirosPessoaisRealizados: number;
  iniciouEm: Date | null;
};

function mapProgresso(rows: ProgRow[]): ProgressoEtapa[] {
  return rows.map((p) => ({
    nivel: p.nivelFormativo as NivelFormativo,
    formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas,
    retirosComunitariosRealizados: p.retirosComunitariosRealizados,
    retirosPessoaisRealizados: p.retirosPessoaisRealizados,
    iniciouEm: p.iniciouEm?.toISOString(),
  }));
}

function selectProgresso() {
  return {
    nivelFormativo: true,
    formacoesComunitariasRealizadas: true,
    retirosComunitariosRealizados: true,
    retirosPessoaisRealizados: true,
    iniciouEm: true,
  } as const;
}

async function carregarOrg(organizacaoId: string): Promise<OrgTermos | null> {
  return prisma.organizacao.findUnique({
    where: { id: organizacaoId },
    select: {
      nome: true,
      termoPreDiscipulado: true,
      termoDiscipulado: true,
      termoPrimeirasPromessas: true,
      termoFormacaoPermanente: true,
      cadenciaAcompanhamentoMeses: true,
    },
  });
}

/** Último acompanhamento 1:1 por formando, escopado (morada opcional). */
async function mapaUltimoAcompanhamento(
  organizacaoId: string,
  grupoFormacaoId: string | null,
): Promise<Map<string, Date | null>> {
  const rows = await prisma.acompanhamentoFormando.groupBy({
    by: ["formandoId"],
    where: { organizacaoId, ...(grupoFormacaoId ? { formando: { grupoFormacaoId } } : {}) },
    _max: { data: true },
  });
  return new Map(rows.map((r) => [r.formandoId, r._max.data ?? null]));
}

/** Pareceres (nota de adesão mais recente por perspectiva) por formando. */
async function mapaPareceres(
  organizacaoId: string,
  grupoFormacaoId: string | null,
): Promise<Map<string, Pareceres>> {
  const avals = await prisma.eventoFormando.findMany({
    where: {
      organizacaoId,
      tipo: "avaliacao-adesao",
      perspectiva: { not: null },
      ...(grupoFormacaoId ? { formando: { grupoFormacaoId } } : {}),
    },
    select: { formandoId: true, perspectiva: true, notaAdesao: true, criadoEm: true },
    orderBy: { criadoEm: "desc" },
  });
  const map = new Map<string, Pareceres>();
  for (const ev of avals) {
    if (!ev.perspectiva || !ev.notaAdesao) continue;
    const entry = map.get(ev.formandoId) ?? {};
    const key = ev.perspectiva as PerspectivaFormativa;
    if (!entry[key]) entry[key] = ev.notaAdesao as NotaAdesao;
    map.set(ev.formandoId, entry);
  }
  return map;
}

function mesesJanela(now: Date, qtd = 6): { yearMonth: string; label: string }[] {
  const out: { yearMonth: string; label: string }[] = [];
  for (let i = qtd - 1; i >= 0; i--) {
    const m = subMonths(now, i);
    const lbl = format(m, "MMM", { locale: ptBR });
    out.push({ yearMonth: format(m, "yyyy-MM"), label: lbl.charAt(0).toUpperCase() + lbl.slice(1) });
  }
  return out;
}

// ── Carregador principal ───────────────────────────────────────────────────────

export async function carregarRelatorio(
  slug: RelatorioSlug,
  ctx: CarregarCtx,
): Promise<RelatorioCarregado> {
  const def = getRelatorioDef(slug)!;
  const { organizacaoId, perfil } = ctx;
  const periodoDias = normalizarPeriodo(ctx.periodoDias);
  const now = new Date();
  const desde = subDays(now, periodoDias);
  const isGestao = GESTAO.includes(perfil);

  const org = await carregarOrg(organizacaoId);
  const etapaLabel = construirEtapaLabel(org);
  const metaBase: RelatorioMeta = {
    slug,
    titulo: def.titulo,
    orgNome: org?.nome ?? "Organização",
    periodoDias,
    geradoEmISO: now.toISOString(),
    escopo: def.escopo,
  };

  // ── Relatórios de MORADA (R1, R2) ──────────────────────────────────────────
  if (def.escopo === "morada") {
    // Resolve a morada-alvo: FC → sua morada; gestão → a selecionada.
    const moradaAlvo = perfil === "formador_comunitario" ? ctx.grupoFormacaoId : ctx.moradaId ?? null;

    const moradasDisponiveis = isGestao
      ? await prisma.grupoFormacao.findMany({
          where: { organizacaoId, ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : undefined;

    if (!moradaAlvo) {
      return {
        meta: {
          ...metaBase,
          moradasDisponiveis,
          precisaSelecionarMorada: isGestao,
          semMorada: !isGestao,
        },
        resultado: null,
      };
    }

    const morada = await prisma.grupoFormacao.findFirst({
      where: { id: moradaAlvo, organizacaoId },
      select: { id: true, nome: true },
    });
    if (!morada) {
      return { meta: { ...metaBase, moradasDisponiveis, precisaSelecionarMorada: isGestao }, resultado: null };
    }

    const [formandos, presencas] = await Promise.all([
      prisma.formando.findMany({
        where: { grupoFormacaoId: moradaAlvo, organizacaoId, deletedAt: null },
        select: { id: true, nome: true, nivelFormativo: true, ativo: true, progressoEtapas: { select: selectProgresso() } },
        orderBy: { nome: "asc" },
      }),
      prisma.presencaFormacao.findMany({
        where: { organizacaoId, data: { gte: desde, lte: now }, formando: { grupoFormacaoId: moradaAlvo } },
        select: { formandoId: true, agendamentoId: true, data: true, presente: true, statusFormador: true, formacaoTema: true },
        orderBy: { data: "asc" },
      }),
    ]);

    const meta: RelatorioMeta = { ...metaBase, moradaNome: morada.nome, moradasDisponiveis };

    if (slug === "acompanhamento-morada") {
      const [ultimoAcomp, pareceres] = await Promise.all([
        mapaUltimoAcompanhamento(organizacaoId, moradaAlvo),
        mapaPareceres(organizacaoId, moradaAlvo),
      ]);
      const dados = montarRelatorioAcompanhamentoMorada(
        formandos.map((f) => ({
          id: f.id,
          nome: f.nome,
          nivelFormativo: f.nivelFormativo as NivelFormativo,
          ativo: f.ativo,
          progressoEtapas: mapProgresso(f.progressoEtapas),
        })),
        presencas.map((p) => ({
          formandoId: p.formandoId,
          data: p.data.toISOString(),
          presente: p.presente,
          statusFormador: p.statusFormador,
        })),
        ultimoAcomp,
        pareceres,
        org?.cadenciaAcompanhamentoMeses,
        etapaLabel,
        now,
      );
      return { meta, resultado: { slug, dados } };
    }

    // frequencia — só ativos entram na matriz
    const dados = montarRelatorioFrequencia(
      formandos.filter((f) => f.ativo).map((f) => ({ id: f.id, nome: f.nome })),
      presencas.map((p) => ({
        formandoId: p.formandoId,
        agendamentoId: p.agendamentoId,
        data: p.data.toISOString(),
        titulo: p.formacaoTema,
        presente: p.presente,
        statusFormador: p.statusFormador,
      })),
    );
    return { meta, resultado: { slug: "frequencia", dados } };
  }

  // ── Relatórios de ORG (R3, R4, R5, R6) — só gestão ─────────────────────────
  if (slug === "executivo") {
    const sixMonthsAgo = startOfMonth(subMonths(now, 5));
    const months = mesesJanela(now, 6);
    const [ingressos, totalFormandos, formandosAtivos, inativos, totalMoradas, totalFormadores, formandosJornada, presMorada, presMoradaMes] =
      await Promise.all([
        prisma.formando.findMany({ where: { organizacaoId, deletedAt: null, dataIngresso: { gte: sixMonthsAgo } }, select: { dataIngresso: true } }),
        prisma.formando.count({ where: { organizacaoId, deletedAt: null } }),
        prisma.formando.count({ where: { organizacaoId, deletedAt: null, ativo: true } }),
        prisma.formando.count({ where: { organizacaoId, deletedAt: null, ativo: false } }),
        prisma.grupoFormacao.count({ where: { organizacaoId, ativo: true } }),
        prisma.usuario.count({ where: { organizacaoId, ativo: true, deletedAt: null, perfil: { in: ["formador_geral", "formador_comunitario"] } } }),
        prisma.formando.findMany({ where: { organizacaoId, deletedAt: null, ativo: true }, select: { nivelFormativo: true, progressoEtapas: { select: selectProgresso() } } }),
        prisma.$queryRaw<{ total: number; presentes: number }[]>`
          SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE p.presente)::int AS presentes
          FROM "PresencaFormacao" p JOIN "Formando" f ON f.id = p."formandoId"
          WHERE p."organizacaoId" = ${organizacaoId} AND p.data >= ${subDays(now, 90)} AND p.data <= ${now} AND f.morada_id IS NOT NULL`,
        prisma.$queryRaw<{ ym: string; total: number; presentes: number }[]>`
          SELECT to_char(date_trunc('month', p.data), 'YYYY-MM') AS ym, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE p.presente)::int AS presentes
          FROM "PresencaFormacao" p JOIN "Formando" f ON f.id = p."formandoId"
          WHERE p."organizacaoId" = ${organizacaoId} AND p.data >= ${sixMonthsAgo} AND p.data <= ${now} AND f.morada_id IS NOT NULL
          GROUP BY ym`,
      ]);

    const dados = montarRelatorioExecutivo({
      ingressos: ingressos.map((i) => i.dataIngresso),
      totalFormandos,
      formandosAtivos,
      inativos,
      presencaPorMorada: presMorada.map((r) => ({ total: Number(r.total), presentes: Number(r.presentes) })),
      presencaPorMoradaMes: presMoradaMes.map((r) => ({ ym: r.ym, total: Number(r.total), presentes: Number(r.presentes) })),
      formandosJornada: formandosJornada.map((f) => ({ nivelFormativo: f.nivelFormativo as NivelFormativo, progressoEtapas: mapProgresso(f.progressoEtapas) })),
      totalMoradas,
      totalFormadores,
      months,
    });
    return { meta: metaBase, resultado: { slug: "executivo", dados } };
  }

  // R3/R4/R5 compartilham moradas + formandos + presenças da org.
  const [moradas, formandos, presencas] = await Promise.all([
    prisma.grupoFormacao.findMany({
      where: { organizacaoId, ativo: true },
      select: { id: true, nome: true, planoId: true, gradeId: true, formador: { select: { nome: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.formando.findMany({
      where: { organizacaoId, deletedAt: null },
      select: { id: true, nome: true, ativo: true, nivelFormativo: true, grupoFormacaoId: true, grupoFormacao: { select: { nome: true } }, progressoEtapas: { select: selectProgresso() } },
      orderBy: { nome: "asc" },
    }),
    prisma.presencaFormacao.findMany({
      where: { organizacaoId, data: { gte: desde, lte: now } },
      select: { formandoId: true, data: true, presente: true, statusFormador: true },
    }),
  ]);

  const presencasRel = presencas.map((p) => ({
    formandoId: p.formandoId,
    data: p.data.toISOString(),
    presente: p.presente,
    statusFormador: p.statusFormador,
  }));
  const formandosProg = formandos.map((f) => ({
    id: f.id,
    nome: f.nome,
    ativo: f.ativo,
    moradaId: f.grupoFormacaoId,
    moradaNome: f.grupoFormacao?.nome ?? null,
    nivelFormativo: f.nivelFormativo as NivelFormativo,
    progressoEtapas: mapProgresso(f.progressoEtapas),
  }));

  if (slug === "consolidado-moradas") {
    const ultimoAcomp = await mapaUltimoAcompanhamento(organizacaoId, null);
    const dados = montarRelatorioConsolidado(
      moradas.map((m) => ({ id: m.id, nome: m.nome, formadorNome: m.formador?.nome ?? null, temPlano: !!m.planoId, temGrade: !!m.gradeId })),
      formandosProg.map((f) => ({ id: f.id, moradaId: f.moradaId, nivelFormativo: f.nivelFormativo, ativo: f.ativo, progressoEtapas: f.progressoEtapas })),
      presencasRel,
      ultimoAcomp,
      org?.cadenciaAcompanhamentoMeses,
      now,
    );
    return { meta: metaBase, resultado: { slug: "consolidado-moradas", dados } };
  }

  if (slug === "jornada-comunidade") {
    const dados = montarRelatorioJornada(
      formandosProg.map((f) => ({ id: f.id, nome: f.nome, moradaNome: f.moradaNome, nivelFormativo: f.nivelFormativo, ativo: f.ativo, progressoEtapas: f.progressoEtapas })),
      presencasRel,
      etapaLabel,
      now,
    );
    return { meta: metaBase, resultado: { slug: "jornada-comunidade", dados } };
  }

  // cobertura-acompanhamento
  const ultimoAcomp = await mapaUltimoAcompanhamento(organizacaoId, null);
  const dados = montarRelatorioCobertura(
    moradas.map((m) => ({ id: m.id, nome: m.nome, formadorNome: m.formador?.nome ?? null })),
    formandosProg.map((f) => ({ id: f.id, nome: f.nome, moradaId: f.moradaId, ativo: f.ativo })),
    ultimoAcomp,
    org?.cadenciaAcompanhamentoMeses,
    now,
  );
  return { meta: metaBase, resultado: { slug: "cobertura-acompanhamento", dados } };
}
