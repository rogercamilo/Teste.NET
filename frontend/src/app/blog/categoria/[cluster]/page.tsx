import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/structured-data";
import { marketingMeta } from "@/lib/seo";
import { PostCard } from "@/components/blog/PostCard";
import {
  getUsedClusters,
  getPostsByCluster,
  isClusterId,
  clusterLabel,
  clusterDescription,
} from "@/lib/blog";

// Pillar pages por cluster de conteúdo. Só geramos as que têm artigos
// (getUsedClusters) — clusters vazios respondem 404 em vez de virar páginas
// magras que prejudicam o SEO.
export function generateStaticParams() {
  return getUsedClusters().map(({ id }) => ({ cluster: id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cluster: string }>;
}): Promise<Metadata> {
  const { cluster } = await params;
  if (!isClusterId(cluster)) return { title: "Tema não encontrado" };
  const label = clusterLabel(cluster);
  return {
    title: label,
    description: clusterDescription(cluster),
    ...marketingMeta({
      title: `${label} — Blog Formattio`,
      description: clusterDescription(cluster),
      path: `/blog/categoria/${cluster}`,
    }),
  };
}

export default async function BlogCluster({
  params,
}: {
  params: Promise<{ cluster: string }>;
}) {
  const { cluster } = await params;
  if (!isClusterId(cluster)) notFound();

  const posts = getPostsByCluster(cluster);
  // Cluster válido mas sem artigos publicados (ex.: rascunhos ocultos em prod).
  if (posts.length === 0) notFound();

  const label = clusterLabel(cluster);

  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <JsonLd
        data={breadcrumbLd([
          { name: "Início", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: label, path: `/blog/categoria/${cluster}` },
        ])}
      />
      <MarketingNav />

      {/* Hero */}
      <section className="relative bg-slate-950 pt-32 pb-14 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative max-w-6xl mx-auto px-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Todos os artigos
          </Link>
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-3">
            Tema
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight max-w-3xl">
            {label}
          </h1>
          <p className="mt-5 text-lg text-slate-400 max-w-2xl">{clusterDescription(cluster)}</p>
        </div>
      </section>

      {/* Lista */}
      <section className="bg-slate-950 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
