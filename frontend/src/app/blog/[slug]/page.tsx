import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { JsonLd } from "@/components/JsonLd";
import { articleLd, breadcrumbLd, SITE_URL } from "@/lib/structured-data";
import { OG_IMAGE } from "@/lib/seo";
import { mdxComponents } from "@/components/blog/mdx-components";
import { getAllSlugs, getPostBySlug, clusterLabel } from "@/lib/blog";

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

  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <JsonLd
        data={[
          articleLd({
            title: meta.title,
            description: meta.description,
            slug,
            date: meta.date,
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
            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1 mb-5">
              {clusterLabel(meta.cluster)}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
              {meta.title}
            </h1>
            <p className="mt-4 text-lg text-slate-400 leading-relaxed">{meta.description}</p>
            <p className="mt-5 text-xs text-slate-500">
              {meta.author} · {formatDate(meta.date)} · {meta.readingMinutes} min de leitura
            </p>
          </header>

          {/* Corpo MDX */}
          <div className="max-w-none">
            <MDXRemote source={content} components={mdxComponents} />
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
