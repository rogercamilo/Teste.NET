/**
 * Catálogo de relatórios — fonte ÚNICA do registro de relatórios da plataforma.
 *
 * Define, por slug, o rótulo, a descrição, o ícone, os perfis que podem ver o
 * relatório e o escopo (uma morada × a organização inteira). Consumido por:
 *  - a página de catálogo (`/relatorios`) — monta os cards do perfil;
 *  - a página do relatório (`/relatorios/[slug]`) — valida acesso + escopo;
 *  - o carregador server (`carregar.ts`) e a API de export — mesmo gating.
 *
 * Módulo PURO (sem Prisma, sem render): pode ser importado em server e client.
 */

import type { LucideIcon } from "lucide-react";
import { Users, Calendar, Home, GitBranch, CalendarClock, TrendingUp } from "lucide-react";
import type { PerfilUsuario } from "@/types";

/** "morada" = escopo de uma única morada; "org" = organização inteira. */
export type EscopoRelatorio = "morada" | "org";

export type RelatorioSlug =
  | "acompanhamento-morada"
  | "frequencia"
  | "consolidado-moradas"
  | "jornada-comunidade"
  | "cobertura-acompanhamento"
  | "executivo";

export interface RelatorioDef {
  slug: RelatorioSlug;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  /** Perfis que enxergam e podem gerar este relatório. */
  perfis: PerfilUsuario[];
  escopo: EscopoRelatorio;
}

const GESTAO: PerfilUsuario[] = ["formador_geral", "fundador", "administrador"];
const TODOS_ACOMPANHAM: PerfilUsuario[] = ["formador_comunitario", ...GESTAO];

/**
 * Registro dos relatórios. A ordem aqui é a ordem dos cards no catálogo.
 * Relatórios de escopo "morada": o FC vê a própria morada; a gestão escolhe a
 * morada por filtro. Relatórios "org": só gestão (FG/Fundador/Admin).
 */
export const RELATORIOS: RelatorioDef[] = [
  {
    slug: "acompanhamento-morada",
    titulo: "Acompanhamento da Morada",
    descricao:
      "Cada formando com etapa, progresso, presença, situação de risco, acompanhamento individual e pareceres por perspectiva.",
    icone: Users,
    perfis: TODOS_ACOMPANHAM,
    escopo: "morada",
  },
  {
    slug: "frequencia",
    titulo: "Frequência por Encontro",
    descricao:
      "Mapa de presença formando × encontro no período, com percentual por formando e por encontro.",
    icone: Calendar,
    perfis: TODOS_ACOMPANHAM,
    escopo: "morada",
  },
  {
    slug: "consolidado-moradas",
    titulo: "Consolidado por Morada",
    descricao:
      "Visão geral de todas as moradas: formador responsável, ativos, presença média, em risco e cobertura de acompanhamento.",
    icone: Home,
    perfis: GESTAO,
    escopo: "org",
  },
  {
    slug: "jornada-comunidade",
    titulo: "Jornada Formativa da Comunidade",
    descricao:
      "Distribuição dos formandos por etapa, prontos para avançar e em atenção — a jornada inteira da comunidade.",
    icone: GitBranch,
    perfis: GESTAO,
    escopo: "org",
  },
  {
    slug: "cobertura-acompanhamento",
    titulo: "Cobertura de Acompanhamento",
    descricao:
      "Por morada: quantos formandos estão em dia, atrasados ou nunca acompanhados na cadência da comunidade.",
    icone: CalendarClock,
    perfis: GESTAO,
    escopo: "org",
  },
  {
    slug: "executivo",
    titulo: "Relatório Executivo",
    descricao:
      "Crescimento, retenção, presença global e progresso médio da jornada — a leitura macro da comunidade.",
    icone: TrendingUp,
    perfis: ["fundador", "administrador"],
    escopo: "org",
  },
];

const PORSLUG = new Map(RELATORIOS.map((r) => [r.slug, r]));

/** Relatórios visíveis para um perfil, na ordem do catálogo. */
export function relatoriosDoPerfil(perfil: PerfilUsuario | string | undefined): RelatorioDef[] {
  return RELATORIOS.filter((r) => !!perfil && r.perfis.includes(perfil as PerfilUsuario));
}

/** Definição de um relatório pelo slug (ou undefined se não existir). */
export function getRelatorioDef(slug: string): RelatorioDef | undefined {
  return PORSLUG.get(slug as RelatorioSlug);
}

/** True se o perfil pode ver/gerar o relatório. */
export function podeVerRelatorio(perfil: PerfilUsuario | string | undefined, slug: string): boolean {
  const def = getRelatorioDef(slug);
  return !!def && !!perfil && def.perfis.includes(perfil as PerfilUsuario);
}

/** Janelas de período oferecidas nos relatórios de acompanhamento. */
export const PERIODOS_RELATORIO = [
  { dias: 30, label: "Últimos 30 dias" },
  { dias: 90, label: "Últimos 90 dias" },
  { dias: 180, label: "Últimos 6 meses" },
  { dias: 365, label: "Último ano" },
] as const;

export const PERIODO_PADRAO_DIAS = 90;

/** Normaliza o período para uma das janelas válidas (cai no padrão de 90 dias). */
export function normalizarPeriodo(dias: number | string | null | undefined): number {
  const n = Number(dias);
  return PERIODOS_RELATORIO.some((p) => p.dias === n) ? n : PERIODO_PADRAO_DIAS;
}
