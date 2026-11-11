/**
 * Tipos e rótulos compartilhados dos relatórios de acompanhamento.
 *
 * Mantém a semântica da "situação" do formando e do estado de presença numa
 * célula coerente entre builder, visualização na tela, PDF e CSV — para que a
 * sinalização NUNCA dependa só de cor (acessibilidade): cada estado tem rótulo.
 */

/** Situação de acompanhamento do formando na etapa atual. */
export type SituacaoFormando = "risco" | "pronto" | "em_dia";

export const SITUACAO_LABELS: Record<SituacaoFormando, string> = {
  risco: "Em atenção",
  pronto: "Pronto para avançar",
  em_dia: "Em dia",
};

/** Estado de presença de um formando num encontro específico. */
export type PresencaCelula = "presente" | "ausente" | "justificado" | "nao_marcado";

export const PRESENCA_CELULA_LABELS: Record<PresencaCelula, string> = {
  presente: "Presente",
  ausente: "Falta",
  justificado: "Falta justificada",
  nao_marcado: "Não registrado",
};

/** Símbolo curto para a matriz de frequência (tela e PDF). */
export const PRESENCA_CELULA_SIMBOLO: Record<PresencaCelula, string> = {
  presente: "P",
  ausente: "F",
  justificado: "J",
  nao_marcado: "·",
};
