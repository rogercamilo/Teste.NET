// Structured data (JSON-LD) builders para SEO.
//
// Renderizados via <JsonLd> (server component que injeta o nonce da CSP).
// Mantidos como funções puras para poderem ser testados e reusados sem
// depender do React. Todo texto é pt-BR e as URLs são absolutas (o Google
// exige URLs absolutas em JSON-LD).

export const SITE_URL = "https://www.formattio.com.br";

/** URLs de perfis sociais oficiais — alimentam o `sameAs` da Organization
 *  (ajuda o Google a montar o painel de conhecimento da marca). Preencha à
 *  medida que os canais forem criados. */
export const SOCIAL_PROFILES: string[] = [
  "https://www.instagram.com/formattio.app",
  "https://www.youtube.com/@Formattio",
];

type Json = Record<string, unknown>;

export function organizationLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Formattio",
    url: SITE_URL,
    logo: `${SITE_URL}/brand/icon-512.png`,
    image: `${SITE_URL}/brand/og-card.png`,
    email: "contato@formattio.com.br",
    description:
      "Plataforma de gestão formativa para novas comunidades, institutos religiosos, grupos de oração e centros formativos. Acompanhamento vocacional, documentos eclesiásticos e conformidade com a LGPD.",
    areaServed: "BR",
    ...(SOCIAL_PROFILES.length ? { sameAs: SOCIAL_PROFILES } : {}),
  };
}

export function websiteLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Formattio",
    url: SITE_URL,
    inLanguage: "pt-BR",
    publisher: { "@type": "Organization", name: "Formattio", url: SITE_URL },
  };
}

/** SoftwareApplication com faixa de preço — dá ao Google contexto de que
 *  Formattio é um SaaS pago e a partir de quanto. Sem `aggregateRating`
 *  (avaliações inventadas são penalizadas; adicionar só com reviews reais). */
export function softwareApplicationLd(): Json {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Formattio",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    inLanguage: "pt-BR",
    description:
      "Software para organizar a jornada formativa de comunidades e institutos: grupos de formação, planos e grades, presença, avaliação nas 3 perspectivas (Humana, Espiritual e Comunitária), Jornada Vocacional e geração de documentos eclesiásticos.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "BRL",
      lowPrice: "97",
      highPrice: "397",
      offerCount: 3,
    },
    publisher: { "@type": "Organization", name: "Formattio", url: SITE_URL },
  };
}

export function faqPageLd(items: { q: string; a: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function productOffersLd(
  plans: { name: string; price: number; desc: string }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Formattio",
    description:
      "Plataforma de gestão formativa para comunidades e institutos religiosos.",
    brand: { "@type": "Brand", name: "Formattio" },
    offers: plans.map(({ name, price, desc }) => ({
      "@type": "Offer",
      name: `Plano ${name}`,
      description: desc,
      price: String(price),
      priceCurrency: "BRL",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/precos`,
    })),
  };
}

/** Article para posts do blog — dá ao Google contexto de conteúdo editorial
 *  (autor, datas, imagem) e habilita rich results de artigo. */
export function articleLd(a: {
  title: string;
  description: string;
  slug: string;
  date: string;
  cover?: string;
}): Json {
  const url = `${SITE_URL}/blog/${a.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    datePublished: a.date,
    dateModified: a.date,
    inLanguage: "pt-BR",
    mainEntityOfPage: url,
    url,
    image: a.cover ? `${SITE_URL}${a.cover}` : `${SITE_URL}/brand/og-card.png`,
    author: { "@type": "Organization", name: "Formattio", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "Formattio",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/brand/icon-512.png` },
    },
  };
}

export function breadcrumbLd(
  crumbs: { name: string; path: string }[],
): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map(({ name, path }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE_URL}${path}`,
    })),
  };
}
