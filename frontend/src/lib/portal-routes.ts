// Portas de entrada/retorno dos portais e o público de cada uma.
// SEM imports de propósito: é consumido por edge (proxy), client (dashboard,
// landings) e server (rotas/sessão) — não pode arrastar prisma nem next/headers.

export type PortalAudiencia = "formando" | "vocacional";

/**
 * URL da porta de entrada/retorno do portal para um público. É o destino usado
 * em logout, sessão expirada e demais fallbacks, para que cada pessoa volte
 * sempre pela mesma porta por onde entrou. Default: formando.
 */
export function portalHomeFor(audiencia: PortalAudiencia | null | undefined): string {
  return audiencia === "vocacional" ? "/portal/vocacional" : "/portal/formando";
}
