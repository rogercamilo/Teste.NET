"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { useTermos } from "@/lib/data-store";

interface UsageMetric {
  current: number;
  limit: number | null;
  percentUsed: number;
}

interface Usage {
  plano: string;
  gruposFormacao: UsageMetric;
  formandos: UsageMetric;
  storage: UsageMetric;
}

const DISMISS_KEY = "Formattio_quota_banner_dismissed";
const WARNING_THRESHOLD = 80;
const DANGER_THRESHOLD = 95;

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function QuotaWarningBanner({ role }: { role?: string }) {
  const { grupoFormacao: termoGrupoFormacao } = useTermos();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  // Only admins/formadores_gerais see the banner
  const canSee = role === "administrador" || role === "formador_geral";

  useEffect(() => {
    if (!canSee) return;

    // Check session dismiss state
    const dismissedAt = sessionStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      setDismissed(true);
      return;
    }
    setDismissed(false);

    fetch("/api/organizacao/uso")
      .then((r) => r.json() as Promise<Usage>)
      .then(setUsage)
      .catch(() => {});
  }, [canSee]);

  if (!canSee || dismissed || !usage) return null;

  const metrics = [
    { label: `${termoGrupoFormacao}s`, metric: usage.gruposFormacao, format: (v: number) => String(v) },
    { label: "Formandos", metric: usage.formandos, format: (v: number) => String(v) },
    { label: "Armazenamento", metric: usage.storage, format: formatBytes },
  ];

  const critical = metrics.filter(
    ({ metric }) => metric.limit !== null && metric.percentUsed >= DANGER_THRESHOLD
  );
  const warnings = metrics.filter(
    ({ metric }) => metric.limit !== null && metric.percentUsed >= WARNING_THRESHOLD && metric.percentUsed < DANGER_THRESHOLD
  );

  if (critical.length === 0 && warnings.length === 0) return null;

  const isDanger = critical.length > 0;
  const items = isDanger ? critical : warnings;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setDismissed(true);
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm border-b ${
        isDanger
          ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
          : "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {isDanger ? "Limite crítico atingido: " : "Limite próximo: "}
          {items.map(({ label, metric }) => `${label} (${metric.percentUsed}%)`).join(", ")}
          {" "}—{" "}
          <Link href="/configuracoes?tab=plano" className="underline font-medium hover:opacity-80">
            ver planos
          </Link>
        </span>
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
