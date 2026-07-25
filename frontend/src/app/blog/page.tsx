import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/structured-data";
import { marketingMeta } from "@/lib/seo";
import { getAllPosts, clusterLabel } from "@/lib/blog";

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

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

export default function BlogIndex() {
  const posts = getAllPosts();

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
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] hover:border-primary/40 hover:bg-white/[0.04] transition-colors"
                >
                  {post.cover && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.cover}
                      alt=""
                      className="aspect-[16/9] w-full object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                  <span className="inline-flex self-start items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-4">
                    {clusterLabel(post.cluster)}
                  </span>
                  <h2 className="text-lg font-semibold text-white leading-snug group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed line-clamp-3 flex-1">
                    {post.description}
                  </p>
                  <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {formatDate(post.date)} · {post.readingMinutes} min de leitura
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
