import type { Metadata } from "next";
import { SITE_URL } from "@/lib/structured-data";

// Helpers de metadata para as páginas públicas (marketing + legais).
//
// O Next faz apenas *shallow merge* de metadata: quando uma página declara
// `openGraph`/`twitter`, o objeto do layout raiz é substituído POR COMPLETO
// (perdendo imagem, siteName etc.). A própria doc do Next recomenda extrair os
// campos compartilhados para um módulo e reusá-los — é o que este arquivo faz,
// garantindo card social consistente sem repetir os campos fixos página a
// página.

/** Card social padrão (1200×630) — Open Graph + Twitter usam a mesma arte. */
export const OG_IMAGE = {
  url: "/brand/og-card.png",
  width: 1200,
  height: 630,
  alt: "Formattio — gestão formativa para comunidades e institutos",
} as const;

/** OpenGraph + Twitter + canonical para uma página pública.
 *  `title`/`description` são os textos de compartilhamento (curtos, com o
 *  sufixo “— Formattio” quando fizer sentido); `path` é o caminho a partir da
 *  raiz (ex.: "/recursos"). */
export function marketingMeta(opts: {
  title: string;
  description: string;
  path: string;
}): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
  const { title, description, path } = opts;
  return {
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      siteName: "Formattio",
      type: "website",
      locale: "pt_BR",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
