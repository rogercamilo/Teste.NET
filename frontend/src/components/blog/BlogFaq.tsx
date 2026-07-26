"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqPair } from "@/lib/blog";

/** Bloco de FAQ no fim de um artigo. O conteúdo é visível (o FAQPage schema
 *  exige que a resposta apareça na página) e o mesmo array alimenta o JSON-LD
 *  na página do artigo. */
export function BlogFaq({ items }: { items: FaqPair[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="mt-16 border-t border-white/10 pt-10">
      <h2 className="mb-6 text-lg font-semibold text-white">Perguntas frequentes</h2>
      <div className="space-y-2">
        {items.map(({ q, a }, i) => {
          const isOpen = open === i;
          return (
            <div
              key={q}
              className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-sm font-medium text-white">{q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4">
                  {a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
