import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import { ArrowLeft, ArrowRight, Download, List } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { JsonLd } from "@/components/JsonLd";
import { articleLd, breadcrumbLd, SITE_URL } from "@/lib/structured-data";
import { OG_IMAGE } from "@/lib/seo";
import { mdxComponents } from "@/components/blog/mdx-components";
import { ShareBar } from "@/components/blog/ShareBar";
import {
  getAllSlugs,
  getPostBySlug,
  getRelatedPosts,
  extractHeadings,
  clusterLabel,
} from "@/lib/blog";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(d);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Artigo não encontrado" };

  const { meta } = post;
  const image = meta.cover ? { url: meta.cover, alt: meta.title } : OG_IMAGE;
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${SITE_URL}/blog/${slug}`,
      siteName: "Formattio",
      type: "article",
      publishedTime: meta.date,
      locale: "pt_BR",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [meta.cover ?? OG_IMAGE.url],
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { meta, content } = post;
  const toc = extractHeadings(content);
  const related = getRelatedPosts(slug);
  const url = `${SITE_URL}/blog/${slug}`;

  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <JsonLd
        data={[
          articleLd({
            title: meta.title,
            description: meta.description,
            slug,
            date: meta.date,
            updated: meta.updated,
            cover: meta.cover,
          }),
          breadcrumbLd([
            { name: "Início", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: meta.title, path: `/blog/${slug}` },
          ]),
        ]}
      />
      <MarketingNav />

      <article className="bg-slate-950 pt-32 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar ao blog
          </Link>

          {/* Cabeçalho */}
          <header className="mb-10">
            <Link
              href={`/blog/categoria/${meta.cluster}`}
              className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-5 hover:bg-primary/20 transition-colors"
            >
              {clusterLabel(meta.cluster)}
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              {meta.title}
            </h1>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed">{meta.description}</p>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                {meta.author} · {formatDate(meta.date)} · {meta.readingMinutes} min de leitura
                {meta.updated && (
                  <span className="text-slate-600"> · Atualizado em {formatDate(meta.updated)}</span>
                )}
              </p>
              <ShareBar url={url} title={meta.title} />
            </div>
          </header>

          {/* Capa (opcional) */}
          {meta.cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={meta.cover}
              alt={meta.title}
              className="mb-10 w-full rounded-2xl border border-white/10 object-cover"
            />
          )}

          {/* Índice — "Neste artigo" (só quando há seções suficientes) */}
          {toc.length >= 3 && (
            <nav
              aria-label="Índice do artigo"
              className="mb-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6"
            >
              <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                <List className="h-4 w-4 text-primary" /> Neste artigo
              </p>
              <ul className="space-y-2">
                {toc.map((h) => (
                  <li key={h.id} className={h.depth === 3 ? "pl-4" : ""}>
                    <a
                      href={`#${h.id}`}
                      className="text-sm text-slate-400 hover:text-primary transition-colors"
                    >
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* Corpo MDX */}
          <div className="max-w-none">
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{ mdxOptions: { rehypePlugins: [rehypeSlug] } }}
            />
          </div>

          {/* CTA — ímã de eBook + produto */}
          <aside className="mt-16 rounded-2xl border border-primary/30 bg-primary/[0.06] p-8">
            <h2 className="text-xl font-semibold text-white">
              Leve a governança formativa para a sua comunidade
            </h2>
            <p className="mt-2 text-slate-400">
              Baixe o eBook gratuito e veja, na prática, como organizar a formação com método,
              memória e conformidade.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/#materiais"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-medium px-5 py-3 hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" /> Baixar o eBook gratuito
              </Link>
              <Link
                href="/recursos"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 text-slate-200 font-medium px-5 py-3 hover:bg-white/5 transition-colors"
              >
                Conhecer a plataforma <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>

          {/* Artigos relacionados */}
          {related.length > 0 && (
            <section className="mt-16 border-t border-white/10 pt-10">
              <h2 className="mb-6 text-lg font-semibold text-white">Continue lendo</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/blog/${r.slug}`}
                    className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-primary/40 hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="mb-3 inline-flex self-start items-center rounded-full bg-primary/10 text-primary text-[11px] font-medium px-2.5 py-1">
                      {clusterLabel(r.cluster)}
                    </span>
                    <h3 className="text-base font-semibold text-white leading-snug group-hover:text-primary transition-colors">
                      {r.title}
                    </h3>
                    <span className="mt-3 text-xs text-slate-500">
                      {r.readingMinutes} min de leitura
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Retorno ao blog no fim do artigo */}
          <div className="mt-12 border-t border-white/10 pt-8">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar para o blog
            </Link>
          </div>
        </div>
      </article>

      <MarketingFooter />
    </div>
  );
}
