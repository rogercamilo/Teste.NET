import { ArrowUpRight } from "lucide-react";
import type { Author } from "@/lib/authors";

// Caixa de autor (E-E-A-T) exibida ao fim do artigo. Reforça a autoridade do
// conteúdo: quem escreveu, credencial e links. On-brand (tema escuro), no mesmo
// vocabulário visual das seções de CTA/relacionados do artigo. Suporta autor
// institucional (Organization) e autor-pessoa (Person) — o layout é o mesmo; o
// JSON-LD é que distingue o tipo (ver lib/structured-data.ts / lib/authors.ts).

export function AuthorBox({ author }: { author: Author }) {
  const label = author.type === "Organization" ? "Escrito pela equipe" : "Escrito por";

  return (
    <section className="mt-16 border-t border-white/10 pt-10">
      <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:flex-row sm:items-start sm:gap-6">
        {author.avatar && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={author.avatar}
            alt={author.name}
            className="h-16 w-16 shrink-0 rounded-full border border-white/10 bg-white/5 object-cover p-1"
          />
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-base font-semibold text-white">{author.name}</p>
          {author.title && <p className="text-sm text-primary">{author.title}</p>}
          <p className="mt-3 text-sm leading-relaxed text-slate-400">{author.bio}</p>
          {author.links && author.links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {author.links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target={l.url.startsWith("http") ? "_blank" : undefined}
                  rel={l.url.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-300 hover:text-primary transition-colors"
                >
                  {l.label}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
