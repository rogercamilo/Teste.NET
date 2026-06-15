"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqCategory {
  id: string;
  label: string;
  color: string;
  items: FaqItem[];
}

export function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      {categories.map((cat) => (
        <div key={cat.id}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-1 w-6 rounded-full ${cat.color}`} />
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest">
              {cat.label}
            </h3>
          </div>

          <div className="space-y-2">
            {cat.items.map(({ q, a }, i) => {
              const key = `${cat.id}-${i}`;
              const isOpen = openKey === key;
              return (
                <button
                  key={q}
                  onClick={() => setOpenKey(isOpen ? null : key)}
                  className="w-full text-left rounded-xl border border-white/10 bg-slate-800/40 hover:border-white/20 transition-colors overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="text-sm font-medium text-white">{q}</span>
                    {isOpen
                      ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                    }
                  </div>
                  {isOpen && (
                    <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                      {a}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
