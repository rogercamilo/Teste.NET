import { Star, Quote } from "lucide-react";
import type { DepoimentoPublico } from "@/lib/depoimentos-store";
import type { AggregateRating } from "@/lib/structured-data";

// Seção de prova social (depoimentos de clientes reais). Apresentacional — sem
// estado/efeitos — para poder ser usada tanto na landing (client component)
// quanto em /precos (server component). Tema escuro, on-brand.
//
// A média/contagem exibida aqui DEVE bater com o `aggregateRating` do JSON-LD
// (exigência do Google: rating do schema tem de estar visível na página).

function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${className} ${n <= value ? "fill-primary text-primary" : "text-white/20"}`}
        />
      ))}
    </span>
  );
}

export function Depoimentos({
  depoimentos,
  rating,
}: {
  depoimentos: DepoimentoPublico[];
  rating: AggregateRating | null;
}) {
  if (depoimentos.length === 0) return null;

  return (
    <section id="depoimentos" className="bg-slate-900 py-24 border-y border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
            Quem já usa
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            A palavra de quem forma
          </h2>
          {rating && (
            <div className="inline-flex items-center gap-3 mt-1 px-4 py-2 rounded-full border border-white/10 bg-slate-800/40">
              <Stars value={Math.round(rating.ratingValue)} />
              <span className="text-sm text-slate-300">
                <strong className="text-white">{rating.ratingValue.toFixed(1).replace(".", ",")}</strong>
                {" · "}
                {rating.reviewCount} avaliaç{rating.reviewCount === 1 ? "ão" : "ões"}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {depoimentos.map((d) => (
            <figure
              key={d.id}
              className="flex flex-col rounded-2xl border border-white/10 bg-slate-800/30 p-6"
            >
              <Quote className="h-6 w-6 text-primary/50 mb-3" aria-hidden />
              <Stars value={d.nota} className="h-3.5 w-3.5" />
              <blockquote className="text-sm text-slate-200 leading-relaxed mt-3 flex-1">
                {d.texto}
              </blockquote>
              <figcaption className="flex items-center gap-3 mt-5 pt-5 border-t border-white/5">
                {d.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={d.foto}
                    alt={d.nome}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <span className="h-10 w-10 rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center shrink-0">
                    {d.nome.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{d.nome}</p>
                  {(d.papel || d.comunidade) && (
                    <p className="text-xs text-slate-400 truncate">
                      {[d.papel, d.comunidade].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
