"use client";

import { AlertTriangle, TrendingUp } from "lucide-react";
import type { UsageInfo } from "@/lib/plan-limits";
import { PLANO_ASSINATURA_LABELS } from "@/types";

interface UsageMetric {
  current: number;
  limit: number | null;
  percentUsed: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function UsageBar({ label, metric, formatValue }: {
  label: string;
  metric: UsageMetric;
  formatValue?: (v: number) => string;
}) {
  const fmt = formatValue ?? ((v) => String(v));
  const isUnlimited = metric.limit === null;
  const isWarning = !isUnlimited && metric.percentUsed >= 80;
  const isDanger = !isUnlimited && metric.percentUsed >= 95;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className={`text-xs ${isDanger ? "text-destructive" : isWarning ? "text-amber-600" : "text-muted-foreground"}`}>
          {isUnlimited ? `${fmt(metric.current)} (ilimitado)` : `${fmt(metric.current)} / ${fmt(metric.limit!)}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDanger ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ width: `${Math.min(metric.percentUsed, 100)}%` }}
          />
        </div>
      )}
      {isWarning && !isDanger && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {metric.percentUsed}% utilizado — considere fazer upgrade
        </p>
      )}
    </div>
  );
}

interface PlanUsageProps {
  initialUsage: UsageInfo | null;
}

export default function PlanUsage({ initialUsage }: PlanUsageProps) {
  if (!initialUsage) return null;

  const planoLabel = PLANO_ASSINATURA_LABELS[initialUsage.plano] ?? initialUsage.plano;

  const hasWarning =
    (initialUsage.usuarios.percentUsed >= 80 && initialUsage.usuarios.limit !== null) ||
    (initialUsage.storage.percentUsed >= 80 && initialUsage.storage.limit !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Uso do plano</span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {planoLabel}
        </span>
      </div>

      <div className="space-y-4">
        <UsageBar label="Usuários ativos" metric={initialUsage.usuarios} />
        <UsageBar label="Armazenamento" metric={initialUsage.storage} formatValue={formatBytes} />
      </div>

      {hasWarning && (
        <div className="pt-2 border-t border-border">
          <a href="/configuracoes" className="text-xs text-primary hover:underline font-medium">
            Gerenciar plano →
          </a>
        </div>
      )}
    </div>
  );
}
