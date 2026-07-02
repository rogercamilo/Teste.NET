/**
 * Progresso da jornada por grupo (item 3.1) — helpers puros e testáveis.
 *
 * Toda a lógica de progresso, ritmo e presença vive aqui, isolada do componente,
 * para poder ser testada sem renderizar. Reaproveita as regras de etapa de
 * `types` (REQUISITOS_ETAPAS/SEQUENCIA_ETAPAS/totalRequerido).
 */

import {
  REQUISITOS_ETAPAS,
  SEQUENCIA_ETAPAS,
  totalRequerido,
  type NivelFormativo,
  type ProgressoEtapa,
} from "@/types";

export interface ProgressoResultado {
  done: number;
  total: number;
  pct: number;
}

/** Progresso do membro na etapa `nivel`: soma das 3 realizadas sobre o requerido. */
export function progressoNaEtapa(
  nivel: NivelFormativo,
  progressoEtapas: ProgressoEtapa[] | undefined
): ProgressoResultado {
  const total = totalRequerido(nivel);
  const prog = (progressoEtapas ?? []).find((p) => p.nivel === nivel);
  const done = prog
    ? prog.formacoesComunitariasRealizadas +
      prog.retirosComunitariosRealizados +
      prog.retirosPessoaisRealizados
    : 0;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return { done, total, pct };
}

const MS_POR_DIA = 86_400_000;

/** Meses (aprox., 30,44 dias) desde `iniciouEmISO` até `hoje`. `null` se sem data. */
export function mesesEntre(iniciouEmISO: string | undefined, hoje: Date = new Date()): number | null {
  if (!iniciouEmISO) return null;
  const inicio = new Date(iniciouEmISO);
  if (Number.isNaN(inicio.getTime())) return null;
  const dias = (hoje.getTime() - inicio.getTime()) / MS_POR_DIA;
  return Math.max(0, dias / 30.44);
}

/** % esperado de conclusão pelo tempo decorrido na etapa (linear até 100%). */
export function pctEsperadoNoRitmo(meses: number, duracaoAnos: number): number {
  const totalMeses = duracaoAnos * 12;
  if (totalMeses <= 0) return 0;
  return Math.min(100, Math.round((meses / totalMeses) * 100));
}

/** Margem (em pontos %) abaixo do ritmo esperado para considerar "atrasado". */
export const MARGEM_ATRASO_PP = 34;
/** Piso de meses na etapa antes de sinalizar atraso (evita ruído no início). */
export const MIN_MESES_ATRASO = 2;

/**
 * Sinaliza atraso no ritmo: só quando há tempo suficiente na etapa (>= minMeses)
 * e o % concluído está pelo menos `MARGEM_ATRASO_PP` pontos abaixo do esperado.
 */
export function estaAtrasadoNoRitmo(
  pct: number,
  pctEsperado: number,
  meses: number,
  minMeses = MIN_MESES_ATRASO
): boolean {
  if (meses < minMeses) return false;
  return pctEsperado - pct >= MARGEM_ATRASO_PP;
}

export interface FunilItem {
  nivel: NivelFormativo;
  quantidade: number;
  percentual: number;
}

/** Distribuição dos membros ativos pelas etapas de SEQUENCIA_ETAPAS. */
export function funilPorEtapa(
  formandos: { nivelFormativo: NivelFormativo; ativo: boolean }[]
): FunilItem[] {
  const ativos = formandos.filter((f) => f.ativo);
  const total = ativos.length;
  return SEQUENCIA_ETAPAS.map((nivel) => {
    const quantidade = ativos.filter((f) => f.nivelFormativo === nivel).length;
    return { nivel, quantidade, percentual: total > 0 ? Math.round((quantidade / total) * 100) : 0 };
  });
}

/** Taxa de presença (%) de um membro nos últimos `dias`; `null` se sem registros. */
export function taxaPresenca90d(
  presencas: { formandoId: string; data: string; presente: boolean }[],
  formandoId: string,
  hoje: Date = new Date(),
  dias = 90
): number | null {
  const limite = hoje.getTime() - dias * MS_POR_DIA;
  let total = 0;
  let presentes = 0;
  for (const p of presencas) {
    if (p.formandoId !== formandoId) continue;
    const t = new Date(p.data).getTime();
    if (Number.isNaN(t) || t < limite) continue;
    total++;
    if (p.presente) presentes++;
  }
  return total > 0 ? Math.round((presentes / total) * 100) : null;
}

/** Duração prevista (anos) da etapa, para o cálculo de ritmo. */
export function duracaoAnosEtapa(nivel: NivelFormativo): number {
  return REQUISITOS_ETAPAS[nivel]?.duracaoAnos ?? 0;
}
