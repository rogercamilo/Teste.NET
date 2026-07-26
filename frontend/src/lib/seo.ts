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

/** URL absoluta do card social de um artigo do blog. Usa a capa própria do
 *  artigo (`cover`), se houver; senão gera um card dinâmico via `/api/og` com o
 *  título e o pilar (cluster) — cada artigo ganha uma arte única de
 *  compartilhamento sem precisar de imagem manual. */
export function ogImageForPost(opts: {
  title: string;
  eyebrow: string;
  cover?: string;
}): string {
  if (opts.cover) {
    return opts.cover.startsWith("http") ? opts.cover : `${SITE_URL}${opts.cover}`;
  }
  const qs = new URLSearchParams({ title: opts.title, eyebrow: opts.eyebrow });
  return `${SITE_URL}/api/og?${qs.toString()}`;
}

/** URL absoluta do card social de uma página de marketing (sem `eyebrow` → o
 *  `/api/og` renderiza o card de MARCA com o título específico da página). Cada
 *  página pública ganha uma arte própria em vez da `og-card.png` fixa. */
export function ogImageForPage(opts: { title: string; subtitle?: string }): string {
  const qs = new URLSearchParams({ title: opts.title });
  if (opts.subtitle) qs.set("subtitle", opts.subtitle);
  return `${SITE_URL}/api/og?${qs.toString()}`;
}

/** Remove o sufixo “— Formattio” (ou “— Blog Formattio”) do título para o card
 *  social — a arte já traz o wordmark da marca, então repeti-lo é redundante. */
function cardTitleFrom(title: string): string {
  return title.replace(/\s*[—–-]\s*(Blog\s+)?Formattio\s*$/i, "").trim() || "Formattio";
}

/** OpenGraph + Twitter + canonical para uma página pública.
 *  `title`/`description` são os textos de compartilhamento (curtos, com o
 *  sufixo “— Formattio” quando fizer sentido); `path` é o caminho a partir da
 *  raiz (ex.: "/recursos").
 *
 *  O card social é gerado dinamicamente por página via `/api/og` (título
 *  específico sobre a arte de marca) — sobrepõe a `og-card.png` fixa. Use
 *  `ogTitle`/`ogSubtitle` para customizar o texto do card; por padrão o título
 *  do card é o `title` sem o sufixo da marca. */
export function marketingMeta(opts: {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  ogSubtitle?: string;
}): Pick<Metadata, "alternates" | "openGraph" | "twitter"> {
  const { title, description, path, ogTitle, ogSubtitle } = opts;
  const cardTitle = ogTitle ?? cardTitleFrom(title);
  const image = ogImageForPage({ title: cardTitle, subtitle: ogSubtitle });
  const ogImg = {
    url: image,
    width: 1200,
    height: 630,
    alt: `${cardTitle} — Formattio`,
  };
  return {
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      siteName: "Formattio",
      type: "website",
      locale: "pt_BR",
      images: [ogImg],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
