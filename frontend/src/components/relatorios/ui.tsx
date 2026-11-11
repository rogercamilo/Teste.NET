"use client";

/**
 * Primitivos visuais dos relatórios de acompanhamento.
 *
 * Disciplina do design system: o clay (primary) fica para AÇÃO; o status usa a
 * paleta semântica (emerald/amber/red/slate) já adotada no app. Regra de
 * acessibilidade: a cor NUNCA carrega sozinha — todo estado leva ícone + palavra.
 */

import type { ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CADENCIA_STATUS_LABELS,
  type StatusCadencia,
} from "@/lib/acompanhamento-cadencia";
import { SITUACAO_LABELS, PRESENCA_CELULA_LABELS, PRESENCA_CELULA_SIMBOLO, type SituacaoFormando, type PresencaCelula } from "@/lib/relatorios/tipos";

// ── Faixa de KPIs do resumo ────────────────────────────────────────────────────

export function ResumoKpis({ items }: { items: { label: string; valor: ReactNode; destaque?: "risco" | "bom" }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((k, i) => (
        <div key={i} className="rounded-lg border border-border/60 bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold tracking-tight tabular-nums",
              k.destaque === "risco" ? "text-amber-700" : k.destaque === "bom" ? "text-emerald-700" : "text-foreground",
            )}
          >
            {k.valor}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Badge de situação do formando ──────────────────────────────────────────────

const SITUACAO_STYLE: Record<SituacaoFormando, { cls: string; Icon: typeof AlertTriangle }> = {
  risco: { cls: "bg-amber-100 text-amber-800 ring-amber-200", Icon: AlertTriangle },
  pronto: { cls: "bg-emerald-100 text-emerald-800 ring-emerald-200", Icon: ArrowUpRight },
  em_dia: { cls: "bg-slate-100 text-slate-700 ring-slate-200", Icon: CheckCircle2 },
};

export function SituacaoBadge({ situacao, motivos }: { situacao: SituacaoFormando; motivos?: string[] }) {
  const { cls, Icon } = SITUACAO_STYLE[situacao];
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
        <Icon className="h-3 w-3" aria-hidden />
        {SITUACAO_LABELS[situacao]}
      </span>
      {situacao === "risco" && motivos && motivos.length > 0 && (
        <span className="text-[11px] leading-tight text-muted-foreground">{motivos.join("; ")}</span>
      )}
    </span>
  );
}

// ── Badge de acompanhamento 1:1 (cadência) ─────────────────────────────────────

const CADENCIA_STYLE: Record<StatusCadencia, { cls: string; Icon: typeof AlertTriangle }> = {
  em_dia: { cls: "bg-emerald-100 text-emerald-800 ring-emerald-200", Icon: CheckCircle2 },
  vence_em_breve: { cls: "bg-blue-100 text-blue-800 ring-blue-200", Icon: Clock },
  atrasado: { cls: "bg-red-100 text-red-800 ring-red-200", Icon: AlertTriangle },
  nunca: { cls: "bg-slate-100 text-slate-700 ring-slate-200", Icon: Minus },
};

export function AcompanhamentoBadge({ status, diasAtraso }: { status: StatusCadencia; diasAtraso?: number }) {
  const { cls, Icon } = CADENCIA_STYLE[status];
  const texto = status === "em_dia" ? "Em dia" : status === "vence_em_breve" ? "Vence em breve" : status === "atrasado" ? `Atrasado${diasAtraso ? ` +${diasAtraso}d` : ""}` : "Nunca";
  return (
    <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)} title={CADENCIA_STATUS_LABELS[status]}>
      <Icon className="h-3 w-3" aria-hidden />
      {texto}
    </span>
  );
}

// ── Célula da matriz de frequência ─────────────────────────────────────────────

const PRESENCA_STYLE: Record<PresencaCelula, string> = {
  presente: "bg-emerald-100 text-emerald-800",
  ausente: "bg-red-100 text-red-800",
  justificado: "bg-amber-100 text-amber-800",
  nao_marcado: "bg-muted text-muted-foreground",
};

export function PresencaCelulaTag({ estado }: { estado: PresencaCelula }) {
  return (
    <span
      className={cn("inline-flex h-6 w-6 items-center justify-center rounded text-xs font-semibold", PRESENCA_STYLE[estado])}
      title={PRESENCA_CELULA_LABELS[estado]}
      aria-label={PRESENCA_CELULA_LABELS[estado]}
    >
      {PRESENCA_CELULA_SIMBOLO[estado]}
    </span>
  );
}

export function LegendaFrequencia() {
  const itens: PresencaCelula[] = ["presente", "ausente", "justificado", "nao_marcado"];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {itens.map((e) => (
        <span key={e} className="inline-flex items-center gap-1.5">
          <PresencaCelulaTag estado={e} />
          {PRESENCA_CELULA_LABELS[e]}
        </span>
      ))}
    </div>
  );
}

// ── Tabela base (responsiva) ───────────────────────────────────────────────────

export function Tabela({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className={cn("w-full min-w-0 border-collapse text-sm", className)}>{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn("whitespace-nowrap border-b border-border bg-muted/40 px-3 py-2 text-left text-xs font-semibold text-muted-foreground", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-border/50 px-3 py-2 align-top text-foreground", className)}>{children}</td>;
}

/** Barra de proporção fina (distribuição por etapa) — rótulo e número sempre visíveis. */
export function DistribuicaoEtapa({ itens }: { itens: { etapaLabel: string; quantidade: number; percentual: number }[] }) {
  const max = Math.max(...itens.map((i) => i.quantidade), 1);
  return (
    <div className="flex flex-col gap-2">
      {itens.map((it, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-foreground">{it.etapaLabel}</span>
          <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted/50">
            <div className="h-full rounded bg-primary/25" style={{ width: `${(it.quantidade / max) * 100}%` }} />
          </div>
          <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {it.quantidade} · {it.percentual}%
          </span>
        </div>
      ))}
    </div>
  );
}
