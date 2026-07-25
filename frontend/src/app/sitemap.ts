import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/structured-data";

// Mapa das páginas públicas indexáveis. Prioridades e frequência sinalizam ao
// Googlebot a importância relativa (a home e as páginas de conversão pesam
// mais que as legais). Atualize ao adicionar novas páginas de marketing.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1.0, changeFrequency: "weekly" },
    { path: "/recursos", priority: 0.9, changeFrequency: "monthly" },
    { path: "/para-quem-e", priority: 0.9, changeFrequency: "monthly" },
    { path: "/precos", priority: 0.9, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
    { path: "/termos", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacidade", priority: 0.3, changeFrequency: "yearly" },
  ];

  return pages.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
