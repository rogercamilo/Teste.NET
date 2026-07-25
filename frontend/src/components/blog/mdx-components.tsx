import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

// Mapeamento dos elementos gerados pelo MDX para o visual do site (tema escuro,
// paleta argila). São componentes de servidor (só estilo, sem interatividade),
// então respeitam a CSP sem nonce. Usado por <MDXRemote components={mdxComponents} />.

type AProps = ComponentPropsWithoutRef<"a">;

export const mdxComponents = {
  h2: (p: ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-2xl md:text-3xl font-semibold text-white mt-12 mb-4 scroll-mt-24" {...p} />
  ),
  h3: (p: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-xl font-semibold text-white mt-8 mb-3 scroll-mt-24" {...p} />
  ),
  p: (p: ComponentPropsWithoutRef<"p">) => (
    <p className="text-slate-300 leading-relaxed mb-5" {...p} />
  ),
  ul: (p: ComponentPropsWithoutRef<"ul">) => (
    <ul className="list-disc pl-6 mb-5 space-y-2 text-slate-300 marker:text-primary" {...p} />
  ),
  ol: (p: ComponentPropsWithoutRef<"ol">) => (
    <ol className="list-decimal pl-6 mb-5 space-y-2 text-slate-300 marker:text-primary" {...p} />
  ),
  li: (p: ComponentPropsWithoutRef<"li">) => <li className="leading-relaxed" {...p} />,
  a: ({ href = "#", ...rest }: AProps) => {
    const external = /^https?:\/\//.test(href);
    const cls = "text-primary underline underline-offset-2 hover:text-primary/80 transition-colors";
    return external ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest} />
    ) : (
      <Link href={href} className={cls} {...rest} />
    );
  },
  strong: (p: ComponentPropsWithoutRef<"strong">) => (
    <strong className="text-white font-semibold" {...p} />
  ),
  blockquote: (p: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-4 border-primary/50 pl-5 my-6 italic text-slate-400" {...p} />
  ),
  hr: () => <hr className="my-10 border-white/10" />,
  img: ({ alt = "", ...rest }: ComponentPropsWithoutRef<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className="rounded-lg my-6 w-full" {...rest} />
  ),
  code: (p: ComponentPropsWithoutRef<"code">) => (
    <code className="bg-white/10 text-slate-200 px-1.5 py-0.5 rounded text-[0.9em]" {...p} />
  ),
  pre: (p: ComponentPropsWithoutRef<"pre">) => (
    <pre className="bg-slate-900 border border-white/10 rounded-lg p-4 overflow-x-auto my-6 text-sm" {...p} />
  ),
};
