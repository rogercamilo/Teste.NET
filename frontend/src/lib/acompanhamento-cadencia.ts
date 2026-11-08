/**
 * Cadência do dever comunitário de acompanhar cada formando (1:1).
 *
 * Cada tenant define, pelo Formador Geral, com que frequência o formador
 * comunitário deve fazer um acompanhamento individual de cada formando
 * (Mensal/Bimestral/Trimestral). Este módulo é a FONTE ÚNICA do sinal
 * "em dia / atrasado" exibido nas três superfícies: ficha do formando,
 * lista de formandos (morada/geral) e dashboard do FC. Helpers puros e
 * testáveis, sem dependência de render nem de Prisma.
 */

import { addMonths, differenceInCalendarDays } from "date-fns";

export const CADENCIA_ACOMPANHAMENTO_OPCOES = [1, 2, 3] as const;
export type CadenciaAcompanhamentoMeses = (typeof CADENCIA_ACOMPANHAMENTO_OPCOES)[number];

export const CADENCIA_ACOMPANHAMENTO_LABELS: Record<number, string> = {
  1: "Mensal",
  2: "Bimestral",
  3: "Trimestral",
};

/** Normaliza a cadência para 1..3 meses (cai em 1 = Mensal fora da faixa). */
export function normalizarCadencia(meses: number | null | undefined): number {
  const n = typeof meses === "number" && Number.isFinite(meses) ? Math.floor(meses) : 1;
  return n >= 1 && n <= 3 ? n : 1;
}

/** Rótulo seguro para qualquer valor de cadência. */
export function cadenciaLabel(meses: number | null | undefined): string {
  return CADENCIA_ACOMPANHAMENTO_LABELS[normalizarCadencia(meses)];
}

export type StatusCadencia = "nunca" | "atrasado" | "vence_em_breve" | "em_dia";

/** Mapa formandoId → status de acompanhamento, computado no servidor e passado às listas. */
export type CadenciaStatusMap = Record<string, { status: StatusCadencia; diasAtraso: number }>;

export const CADENCIA_STATUS_LABELS: Record<StatusCadencia, string> = {
  nunca: "Sem acompanhamento",
  atrasado: "Acompanhamento atrasado",
  vence_em_breve: "Acompanhamento vence em breve",
  em_dia: "Acompanhamento em dia",
};

export interface CadenciaAcompanhamento {
  status: StatusCadencia;
  /** Data limite do próximo acompanhamento (último + cadência). null se nunca houve. */
  proximoEsperado: Date | null;
  /** Dias de atraso além do prazo (>0 só quando `atrasado`). */
  diasAtraso: number;
  /** Dias desde o último acompanhamento. null se nunca houve. */
  diasDesdeUltimo: number | null;
  /** True quando precisa de ação do formador (nunca acompanhado ou atrasado). */
  precisaAcao: boolean;
}

/** Janela (dias) antes do prazo em que sinalizamos "vence em breve". */
export const JANELA_VENCE_EM_BREVE_DIAS = 7;

/**
 * Avalia o dever de acompanhamento 1:1 de um formando à luz da cadência do tenant
 * (em meses) e da data do último acompanhamento registrado.
 *
 * - sem acompanhamento algum → `nunca` (precisa de ação);
 * - passou do prazo (último + cadência) → `atrasado` (precisa de ação);
 * - dentro da janela final → `vence_em_breve` (aviso suave);
 * - caso contrário → `em_dia`.
 */
export function avaliarCadenciaAcompanhamento(
  cadenciaMeses: number,
  ultimoAcompanhamento: Date | null | undefined,
  hoje: Date = new Date(),
): CadenciaAcompanhamento {
  const meses = normalizarCadencia(cadenciaMeses);
  if (!ultimoAcompanhamento) {
    return { status: "nunca", proximoEsperado: null, diasAtraso: 0, diasDesdeUltimo: null, precisaAcao: true };
  }
  const proximoEsperado = addMonths(ultimoAcompanhamento, meses);
  const diasDesdeUltimo = Math.max(0, differenceInCalendarDays(hoje, ultimoAcompanhamento));
  const diasParaPrazo = differenceInCalendarDays(proximoEsperado, hoje);
  if (diasParaPrazo < 0) {
    return { status: "atrasado", proximoEsperado, diasAtraso: -diasParaPrazo, diasDesdeUltimo, precisaAcao: true };
  }
  if (diasParaPrazo <= JANELA_VENCE_EM_BREVE_DIAS) {
    return { status: "vence_em_breve", proximoEsperado, diasAtraso: 0, diasDesdeUltimo, precisaAcao: false };
  }
  return { status: "em_dia", proximoEsperado, diasAtraso: 0, diasDesdeUltimo, precisaAcao: false };
}
