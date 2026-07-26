import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/structured-data";
import { getAllPosts, getUsedClusters } from "@/lib/blog";

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
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" },
    { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
    { path: "/termos", priority: 0.3, changeFrequency: "yearly" },
    { path: "/privacidade", priority: 0.3, changeFrequency: "yearly" },
  ];

  const staticEntries: MetadataRoute.Sitemap = pages.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  // Artigos do blog entram automaticamente (lastModified = última revisão, ou a publicação).
  const postEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(`${post.updated ?? post.date}T00:00:00`),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Pillar pages por cluster (só as que têm artigos) — hubs de tema para SEO.
  const clusterEntries: MetadataRoute.Sitemap = getUsedClusters().map(({ id }) => ({
    url: `${SITE_URL}/blog/categoria/${id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...postEntries, ...clusterEntries];
}
