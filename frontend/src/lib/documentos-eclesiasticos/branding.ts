import { THEME_PALETTES } from "@/lib/themes";

/**
 * Identidade visual da organização aplicada aos documentos da Jornada Vocacional
 * (Vitrine + geração real). Fase 1 da personalização: cor de destaque + logo.
 * Reusa os campos que a org já edita (`temaCor`, `logoUrl`) — sem migração.
 */
export interface DocumentoBranding {
  /**
   * Cor de destaque do cabeçalho (nome da org + filete). Hex concreto — o
   * react-pdf NÃO aceita `oklch()`, então derivamos do `preview` da paleta.
   */
  corHex: string;
  /**
   * Logo em data-URL PNG/JPEG, pronto para `<Image>`. `null` = cabeçalho só
   * textual (comportamento atual).
   */
  logoDataUrl: string | null;
}

/** Azul-marinho neutro dos documentos quando a org não tem tema resolvível. */
const COR_PADRAO = "#1e3a5f";

export const BRANDING_PADRAO: DocumentoBranding = {
  corHex: COR_PADRAO,
  logoDataUrl: null,
};

/** Mapeia o token de tema da org (`temaCor`) para o hex de destaque da paleta. */
export function resolveTemaHex(temaCor: string | null | undefined): string {
  if (!temaCor) return COR_PADRAO;
  const alvo = temaCor.trim().toLowerCase();
  const palette = THEME_PALETTES.find((p) => p.key.toLowerCase() === alvo);
  return palette?.preview ?? COR_PADRAO;
}

/**
 * O `<Image>` do react-pdf só decodifica PNG e JPEG. Um data-URL de SVG/WEBP
 * (ou valor inesperado) quebraria a geração INTEIRA — inaceitável num documento
 * canônico. Por isso só deixamos passar PNG/JPEG; o resto cai no cabeçalho
 * textual.
 */
const LOGO_ACEITO = /^data:image\/(png|jpe?g);base64,/i;

export function sanitizeLogo(logoUrl: string | null | undefined): string | null {
  if (!logoUrl) return null;
  return LOGO_ACEITO.test(logoUrl) ? logoUrl : null;
}

export function resolveDocumentoBranding(
  org: { temaCor?: string | null; logoUrl?: string | null } | null | undefined
): DocumentoBranding {
  if (!org) return BRANDING_PADRAO;
  return {
    corHex: resolveTemaHex(org.temaCor),
    logoDataUrl: sanitizeLogo(org.logoUrl),
  };
}
