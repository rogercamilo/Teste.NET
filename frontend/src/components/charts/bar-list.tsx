"use client";

/**
 * BarList — componente copy-in no estilo Tremor (tremor.so), adaptado ao design
 * system do projeto (helper `cn`, tokens de tema do Tailwind). Copy-in = o código
 * vive no repositório (igual ao shadcn), sem dependência npm — por isso funciona
 * no Tailwind 4, onde o pacote `@tremor/react` (Tailwind v3) não roda.
 *
 * Uso em BI: ranking horizontal (ex.: moradas por nº de membros ativos). A barra
 * é proporcional ao maior valor; o rótulo e o número ficam SEMPRE visíveis, então
 * a leitura não depende de cor (acessibilidade/inclusão digital).
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface BarListItem {
  /** Rótulo da linha (nome da morada, categoria, etc.). */
  name: string;
  /** Valor numérico — define a largura da barra. */
  value: number;
  /** Texto exibido à direita; default = o próprio value. */
  valueLabel?: string;
  /** href opcional: a linha inteira vira link. */
  href?: string;
  /** Ícone/elemento à esquerda do nome. */
  icon?: ReactNode;
}

interface BarListProps {
  data: BarListItem[];
  /** Classe da barra (cor de fundo). Default = primary suave da marca. */
  barClassName?: string;
  className?: string;
  onItemClick?: (item: BarListItem) => void;
}

export function BarList({ data, barClassName, className, onItemClick }: BarListProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {data.map((item, i) => {
        const widthPct = Math.max((item.value / max) * 100, 2);
        const interactive = !!item.href || !!onItemClick;
        return (
          <div key={`${item.name}-${i}`} className="flex items-center gap-3">
            <div className="relative flex-1 min-w-0">
              {/* Trilha + barra proporcional (anima a largura ao montar/atualizar) */}
              <div
                className={cn(
                  "h-8 rounded-md transition-[width] duration-700 ease-out",
                  barClassName ?? "bg-primary/15",
                )}
                style={{ width: `${widthPct}%` }}
              />
              {/* Nome sobreposto à barra, alinhado à esquerda, sempre legível */}
              <div className="absolute inset-0 flex items-center gap-2 px-2.5">
                {item.icon}
                {item.href ? (
                  <a
                    href={item.href}
                    className="truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {item.name}
                  </a>
                ) : onItemClick ? (
                  <button
                    type="button"
                    onClick={() => onItemClick(item)}
                    className="truncate text-sm font-medium text-foreground text-left hover:underline"
                  >
                    {item.name}
                  </button>
                ) : (
                  <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                )}
              </div>
            </div>
            <span
              className={cn(
                "text-sm font-semibold text-foreground tabular-nums shrink-0 w-12 text-right",
                interactive && "",
              )}
            >
              {item.valueLabel ?? item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
