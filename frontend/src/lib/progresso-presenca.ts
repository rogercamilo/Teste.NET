/**
 * Progresso da etapa a partir da PRESENÇA — regra pura (sem Prisma), usável tanto
 * no cliente (atualização ao vivo na aba Jornada) quanto no servidor
 * (persistência). A orquestração com o banco fica em `progresso-presenca.server`.
 *
 * O "progresso da etapa" conta quantas formações/retiros comunitários o formando
 * de fato realizou. A sinalização de presença (chamada do formador + RSVP do
 * portal) é a prova de que o encontro foi cumprido — logo, é ela que alimenta os
 * contadores `formacoesComunitariasRealizadas`/`retirosComunitariosRealizados`.
 * O retiro pessoal continua manual (não vem da presença).
 */

/** Contadores de etapa derivados de presença (retiro pessoal fica de fora). */
export interface ContagemRealizados {
  formacoesComunitariasRealizadas: number;
  retirosComunitariosRealizados: number;
}

/**
 * Classifica um `tipoEvento` quanto ao requisito de etapa que ele cumpre quando
 * o formando está presente:
 *  - "formacao" / "formacao_complementar" → formação comunitária;
 *  - "retiro" → retiro comunitário;
 *  - convocação, reunião, outro e acompanhamento 1:1 não cumprem requisito.
 */
export function classificarEventoProgresso(
  tipoEvento: string
): "formacao" | "retiro" | null {
  if (tipoEvento === "retiro") return "retiro";
  if (tipoEvento === "formacao" || tipoEvento === "formacao_complementar") return "formacao";
  return null;
}

/** Uma presença foi "cumprida" (conta para o progresso) se o formador marcou presente. */
export function presencaCumprida(p: { statusFormador?: string | null; presente?: boolean }): boolean {
  if (p.statusFormador != null) return p.statusFormador === "presente";
  return !!p.presente; // retrocompat: chamadas antigas sem statusFormador
}
