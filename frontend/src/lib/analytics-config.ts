/**
 * Configuração de analytics/ads.
 *
 * O ID do Meta Pixel é plugável por variável de ambiente (prefixo NEXT_PUBLIC_
 * para ficar disponível no cliente). Vazio = pixel totalmente desativado, sem
 * nenhuma chamada ao Meta — mesmo padrão dos demais recursos externos plugáveis
 * (ver leads-config.ts). Trocar sem novo deploy quando o pixel for criado no
 * Gerenciador de Eventos do Meta.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Fbq = (...args: unknown[]) => void;

/**
 * Dispara um evento do Meta Pixel (ex.: "Lead", "PageView"). Seguro para chamar
 * de qualquer lugar do cliente: só age se o pixel estiver configurado E já
 * carregado — o que só acontece após consentimento de marketing (ver
 * MetaPixel.tsx). Sem pixel ou sem consentimento, é um no-op silencioso.
 */
export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (!META_PIXEL_ID || typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq !== "function") return;
  fbq("track", event, params);
}
