import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/structured-data";

// robots.txt gerado pelo Next. Libera a superfície pública de marketing e
// bloqueia áreas autenticadas / não-indexáveis (o proxy já protege via
// redirect, mas manter fora do crawl economiza budget do Googlebot e evita
// que URLs internas apareçam na SERP).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/portal",
        "/dashboard",
        "/formandos",
        "/formacoes",
        "/grupos-formacao",
        "/grades",
        "/planos",
        "/agenda",
        "/presenca",
        "/comentarios",
        "/documentos",
        "/vocacional",
        "/vitrine",
        "/jornada-vocacional",
        "/livro-registro",
        "/livro-promessas",
        "/configuracoes",
        "/super-admin",
        "/onboarding",
        "/viewer",
        "/rsvp",
        "/materiais/", // páginas de fluxo de lead (obrigado/descadastro) — noindex
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
