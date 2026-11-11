/**
 * Parecer consolidado das perspectivas formativas — régua ÚNICA.
 *
 * Extraído da ficha (`FormandoDetailClient`) para que a ficha E o dossiê do
 * Relatório de Etapa leiam a MESMA média, acabando com a divergência silenciosa
 * (ficha dizia "Boa" enquanto o relatório, preenchido do zero, dizia outra coisa).
 *
 * Dois níveis de média (não pondera a perspectiva mais avaliada): (1) média de
 * TODAS as notas de cada perspectiva (humana/espiritual/comunitária); (2) média
 * dessas médias → banda da escala ordinal. Reflete o conjunto da caminhada, não
 * só o último registro.
 */

import type { NotaAdesao, PerspectivaFormativa } from "@/types";

const NOTA_PESO: Record<NotaAdesao, number> = {
  insuficiente: 1,
  regular: 2,
  boa: 3,
  otima: 4,
};

const PERSPECTIVAS: PerspectivaFormativa[] = ["humana", "espiritual", "comunitaria"];

/** Avaliação de perspectiva (evento `avaliacao-adesao` com perspectiva + nota). */
export interface AvaliacaoPerspectivaInput {
  tipo: string;
  perspectiva?: PerspectivaFormativa | null;
  notaAdesao?: NotaAdesao | null;
  criadoEm: string; // ISO
}

export interface ParecerConsolidado {
  nota: NotaAdesao;
  /** ISO do registro de perspectiva mais recente que compõe o consolidado. */
  data: string;
  /** Quantas das 3 perspectivas têm ao menos uma nota. */
  avaliadas: number;
}

/** Banda ordinal a partir da média numérica (1–4). */
export function bandaDaMedia(media: number): NotaAdesao {
  return media >= 3.5 ? "otima" : media >= 2.5 ? "boa" : media >= 1.5 ? "regular" : "insuficiente";
}

function avaliacoesValidas(eventos: AvaliacaoPerspectivaInput[]) {
  return eventos.filter(
    (e) => e.tipo === "avaliacao-adesao" && e.perspectiva && e.notaAdesao
  );
}

/** Média geral das 3 perspectivas (média das médias). `null` se nenhuma avaliada. */
export function consolidarPerspectivas(
  eventos: AvaliacaoPerspectivaInput[]
): ParecerConsolidado | null {
  const avals = avaliacoesValidas(eventos);
  const mediasPorPerspectiva = PERSPECTIVAS.map((persp) => {
    const notas = avals
      .filter((e) => e.perspectiva === persp)
      .map((e) => NOTA_PESO[e.notaAdesao!]);
    return notas.length > 0 ? notas.reduce((s, n) => s + n, 0) / notas.length : null;
  }).filter((m): m is number => m !== null);

  if (mediasPorPerspectiva.length === 0) return null;

  const media = mediasPorPerspectiva.reduce((s, m) => s + m, 0) / mediasPorPerspectiva.length;
  const data = avals.map((e) => e.criadoEm).sort().at(-1)!;
  return { nota: bandaDaMedia(media), data, avaliadas: mediasPorPerspectiva.length };
}

/**
 * Nota mais recente por perspectiva — usada para PRÉ-PREENCHER as 3 notas do
 * Relatório de Etapa a partir da ficha (o formador confirma/ajusta).
 */
export function notasMaisRecentesPorPerspectiva(
  eventos: AvaliacaoPerspectivaInput[]
): Partial<Record<PerspectivaFormativa, NotaAdesao>> {
  const ordenados = avaliacoesValidas(eventos)
    .slice()
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const out: Partial<Record<PerspectivaFormativa, NotaAdesao>> = {};
  for (const e of ordenados) {
    const k = e.perspectiva as PerspectivaFormativa;
    if (!out[k]) out[k] = e.notaAdesao as NotaAdesao;
  }
  return out;
}
