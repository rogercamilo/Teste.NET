import Link from "next/link";
import type { Metadata } from "next";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/structured-data";
import { marketingMeta } from "@/lib/seo";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts, getUsedClusters, clusterLabel } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Governança formativa na prática: Direito Canônico e CHARIS, jornada vocacional, documentos eclesiásticos e a organização da formação em comunidades novas e institutos católicos.",
  ...marketingMeta({
    title: "Blog — Formattio",
    description:
      "Governança formativa na prática: cânon e CHARIS, jornada vocacional, documentos e a organização da formação da sua comunidade.",
    path: "/blog",
  }),
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const clusters = getUsedClusters();

  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <JsonLd
        data={breadcrumbLd([
          { name: "Início", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <MarketingNav />

      {/* Hero */}
      <section className="relative bg-slate-950 pt-32 pb-14 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative max-w-6xl mx-auto px-4">
          <p className="text-primary text-sm font-medium uppercase tracking-widest mb-3">
            Governança formativa
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight max-w-3xl">
            Método, memória e conformidade na formação da sua comunidade
          </h1>
          <p className="mt-5 text-lg text-slate-400 max-w-2xl">
            Reflexões e guias práticos sobre o que o Direito Canônico e o CHARIS pedem — e
            como dar à formação de pessoas a seriedade que ela merece.
          </p>
        </div>
      </section>

      {/* Lista */}
      <section className="bg-slate-950 py-16">
        <div className="max-w-6xl mx-auto px-4">
          {/* Navegação por pilares (clusters com artigos) */}
          {clusters.length > 0 && (
            <nav aria-label="Temas do blog" className="mb-10 flex flex-wrap gap-2">
              {clusters.map(({ id, count }) => (
                <Link
                  key={id}
                  href={`/blog/categoria/${id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] text-slate-300 text-sm px-4 py-1.5 hover:border-primary/40 hover:text-primary transition-colors"
                >
                  {clusterLabel(id)}
                  <span className="text-xs text-slate-500">{count}</span>
                </Link>
              ))}
            </nav>
          )}

          {posts.length === 0 ? (
            <p className="text-slate-500 text-center py-16">
              Novos conteúdos em breve. Enquanto isso, conheça{" "}
              <Link href="/recursos" className="text-primary underline underline-offset-2">
                os recursos da plataforma
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
