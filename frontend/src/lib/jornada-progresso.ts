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

/**
 * Taxa de presença (%) de um membro nos últimos `dias`; `null` se sem registros.
 * Ignora eventos futuros (`data > hoje`) — não se pode ter faltado a um encontro
 * que ainda não aconteceu (linhas de RSVP criadas antes do evento, item 1.3).
 */
export function taxaPresenca90d(
  presencas: { formandoId: string; data: string; presente: boolean }[],
  formandoId: string,
  hoje: Date = new Date(),
  dias = 90
): number | null {
  const limite = hoje.getTime() - dias * MS_POR_DIA;
  const agora = hoje.getTime();
  let total = 0;
  let presentes = 0;
  for (const p of presencas) {
    if (p.formandoId !== formandoId) continue;
    const t = new Date(p.data).getTime();
    if (Number.isNaN(t) || t < limite || t > agora) continue;
    total++;
    if (p.presente) presentes++;
  }
  return total > 0 ? Math.round((presentes / total) * 100) : null;
}

/** Duração prevista (anos) da etapa, para o cálculo de ritmo. */
export function duracaoAnosEtapa(nivel: NivelFormativo): number {
  return REQUISITOS_ETAPAS[nivel]?.duracaoAnos ?? 0;
}

// ── Risco do formando (item 3.3) ───────────────────────────────────────────────
// Mesma régua da aba Jornada (3.1): atrasado no ritmo E/OU presença baixa.

/** Presença abaixo da qual o formando é considerado em risco (%). */
export const LIMIAR_PRESENCA_RISCO = 50;

export interface RiscoResultado {
  emRisco: boolean;
  motivos: string[];
}

/**
 * Avalia se um formando está "em risco": atrasado no ritmo da etapa (só quando há
 * `iniciouEm`) e/ou com presença abaixo do limiar nos últimos 90 dias. Retorna os
 * motivos legíveis (mesmos chips da aba Jornada). Fonte única de verdade do risco.
 */
export function avaliarRiscoFormando(
  formando: { nivelFormativo: NivelFormativo; progressoEtapas?: ProgressoEtapa[] },
  presencasDoFormando: { formandoId: string; data: string; presente: boolean }[],
  hoje: Date = new Date(),
  formandoId?: string
): RiscoResultado {
  const motivos: string[] = [];

  const { pct } = progressoNaEtapa(formando.nivelFormativo, formando.progressoEtapas);
  const prog = (formando.progressoEtapas ?? []).find((p) => p.nivel === formando.nivelFormativo);
  const meses = mesesEntre(prog?.iniciouEm, hoje);
  if (meses !== null) {
    const esperado = pctEsperadoNoRitmo(meses, duracaoAnosEtapa(formando.nivelFormativo));
    if (estaAtrasadoNoRitmo(pct, esperado, meses)) {
      const m = Math.round(meses);
      motivos.push(`${pct}% em ${m} ${m === 1 ? "mês" : "meses"} de etapa`);
    }
  }

  const idParaPresenca = formandoId ?? presencasDoFormando[0]?.formandoId ?? "";
  const presenca = taxaPresenca90d(presencasDoFormando, idParaPresenca, hoje);
  if (presenca !== null && presenca < LIMIAR_PRESENCA_RISCO) {
    motivos.push(`presença ${presenca}%`);
  }

  return { emRisco: motivos.length > 0, motivos };
}

export type AcaoRisco = "alertar" | "resetar" | "nada";

/** Dias mínimos entre re-alertas do mesmo formando enquanto o risco persiste. */
export const REALERTA_DIAS = 14;

/**
 * Decide a ação de alerta com base no estado atual (`emRisco`) e no último alerta
 * persistido (`riscoAlertadoEm`):
 *  - em risco sem alerta anterior, ou anterior há ≥ `realertaDias` → "alertar";
 *  - recuperou (não está em risco) mas havia alerta → "resetar";
 *  - caso contrário → "nada" (throttle / estável).
 */
export function decidirAcaoRisco(
  emRisco: boolean,
  riscoAlertadoEm: Date | null | undefined,
  hoje: Date = new Date(),
  realertaDias = REALERTA_DIAS
): AcaoRisco {
  if (emRisco) {
    if (!riscoAlertadoEm) return "alertar";
    const dias = (hoje.getTime() - riscoAlertadoEm.getTime()) / 86_400_000;
    return dias >= realertaDias ? "alertar" : "nada";
  }
  return riscoAlertadoEm ? "resetar" : "nada";
}
