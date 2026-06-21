"use client";

import { BarChart3, CircleAlert } from "lucide-react";
import type { OrgRow } from "./_types";
export { MRR_PRICE } from "@/types";

// ── Style maps ────────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  ATIVO:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  TRIAL:    "bg-blue-100 text-blue-700 border-blue-200",
  SUSPENSO: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELADO:"bg-red-100 text-red-700 border-red-200",
};

export const PLANO_COLORS: Record<string, string> = {
  GRATUITO:     "bg-slate-100 text-slate-600",
  BASICO:       "bg-sky-100 text-sky-700",
  INTERMEDIARIO:"bg-violet-100 text-violet-700",
  AVANCADO:     "bg-amber-100 text-amber-700",
  PERSONALIZADO:"bg-emerald-100 text-emerald-700",
};

export const ACAO_CLASS: Record<string, string> = {
  organizacao_deleted:           "bg-red-50 text-red-700 border-red-200",
  organizacao_cancelada:         "bg-red-50 text-red-600 border-red-100",
  organizacao_suspended:         "bg-amber-50 text-amber-700 border-amber-200",
  organizacao_cortesia_concedida:"bg-violet-50 text-violet-700 border-violet-200",
  organizacao_cortesia_revogada: "bg-orange-50 text-orange-700 border-orange-200",
  organizacao_reactivated:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  organizacao_plan_changed:      "bg-blue-50 text-blue-700 border-blue-200",
  login_success:                 "bg-slate-50 text-slate-600 border-slate-200",
  login_failure:                 "bg-red-50 text-red-600 border-red-100",
  login_blocked:                 "bg-red-50 text-red-700 border-red-200",
  user_created:                  "bg-emerald-50 text-emerald-700 border-emerald-200",
  user_deleted:                  "bg-red-50 text-red-600 border-red-100",
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const PAGE_SIZE = 10;

export const STORAGE_LIMITS: Record<string, number> = {
  GRATUITO:     0,
  BASICO:       2  * 1024 * 1024 * 1024,
  INTERMEDIARIO:10 * 1024 * 1024 * 1024,
  AVANCADO:     30 * 1024 * 1024 * 1024,
  PERSONALIZADO:0,
};

export const TIPO_LABELS: Record<string, string> = {
  nova_comunidade:    "Nova Comunidade",
  grupo_oracao:       "Grupo de Oração",
  instituto_religioso:"Instituto Religioso",
  centro_formativo:   "Centro Formativo",
};

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function exportOrgsCSV(orgs: OrgRow[]) {
  const headers = ["Nome", "Tipo", "Status", "Plano", "Formandos", "Grupos", "Usuários", "Storage (MB)", "Onboarding", "Cadastro", "Última Atividade"];
  const rows = orgs.map((o) => [
    o.nome,
    TIPO_LABELS[o.tipoOrganizacao] ?? o.tipoOrganizacao,
    o.status,
    o.planoAssinatura,
    o._count.formandos,
    o._count.gruposFormacao,
    o._count.usuarios,
    (o.storageBytes / (1024 * 1024)).toFixed(2),
    o.onboardingConcluido ? "Concluído" : "Pendente",
    new Date(o.criadoEm).toLocaleDateString("pt-BR"),
    o.lastActivityAt ? new Date(o.lastActivityAt).toLocaleDateString("pt-BR") : "Nunca",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `organizacoes_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Badge components ──────────────────────────────────────────────────────────

export function engajamentoBadge(count: number) {
  if (count === 0) return null;
  const cls =
    count >= 30 ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : count >= 8 ? "bg-blue-50 text-blue-600 border-blue-200"
    : "bg-amber-50 text-amber-600 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium border ${cls}`}>
      <BarChart3 className="h-2.5 w-2.5" />{count}/7d
    </span>
  );
}

export function activityBadge(lastActivityAt: string | null) {
  if (!lastActivityAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200">
        Nunca
      </span>
    );
  }
  const days = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000);
  if (days === 0)
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Hoje</span>;
  if (days <= 7)
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">{days}d atrás</span>;
  if (days <= 30)
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">{days}d atrás</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
      <CircleAlert className="h-3 w-3" />{days}d atrás
    </span>
  );
}

// ── Chart components ──────────────────────────────────────────────────────────

export function MrrHistoryChart({ data }: { data: { month: string; mrr: number }[] }) {
  const max = Math.max(...data.map((d) => d.mrr), 1);
  const fmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-14">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            <div
              className="w-full rounded-t bg-primary/25 hover:bg-primary/40 transition-colors cursor-default"
              style={{ height: `${Math.max((d.mrr / max) * 48, d.mrr > 0 ? 3 : 0)}px` }}
              title={fmt.format(d.mrr)}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground capitalize">{d.month}</div>
        ))}
      </div>
    </div>
  );
}

export function StorageSparkline({ data }: { data: { label: string; bytes: number }[] }) {
  if (data.length < 2) return null;
  const values = data.map((d) => d.bytes);
  const max = Math.max(...values, 1);
  const w = 120, h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - Math.max((v / max) * (h - 4), v > 0 ? 2 : 0);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 text-primary opacity-75" aria-hidden>
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => {
          const x = (i / (values.length - 1)) * w;
          const y = h - Math.max((v / max) * (h - 4), v > 0 ? 2 : 0);
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.5" fill="currentColor" />;
        })}
      </svg>
      <div className="flex justify-between">
        {data.map((d, i) => (
          <span key={i} className="text-[9px] text-muted-foreground">{d.label}</span>
        ))}
      </div>
    </div>
  );
}
