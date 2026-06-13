"use client";

import { Users, HardDrive, AlertTriangle } from "lucide-react";
import type { UsageInfo } from "@/lib/plan-limits";

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

interface MetricRowProps {
  icon: React.ElementType;
  label: string;
  current: number | string;
  limit: number | string | null;
  percentUsed: number;
  formatValue?: (v: number) => string;
}

function MetricRow({ icon: Icon, label, current, limit, percentUsed, formatValue }: MetricRowProps) {
  const isUnlimited = limit === null;
  const pct = Math.min(percentUsed, 100);
  const isDanger = !isUnlimited && percentUsed >= 95;
  const isWarning = !isUnlimited && percentUsed >= 80;

  const barColor = isDanger
    ? "bg-destructive"
    : isWarning
    ? "bg-amber-500"
    : "bg-primary";

  const textColor = isDanger
    ? "text-destructive"
    : isWarning
    ? "text-amber-600"
    : "text-muted-foreground";

  const displayCurrent = typeof current === "number" && formatValue ? formatValue(current) : String(current);
  const displayLimit = typeof limit === "number" && formatValue ? formatValue(limit) : limit !== null ? String(limit) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm text-foreground">{label}</span>
        </div>
        <span className={`text-xs font-medium tabular-nums ${textColor}`}>
          {isUnlimited
            ? `${displayCurrent} (ilimitado)`
            : `${displayCurrent} / ${displayLimit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {isWarning && !isDanger && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {percentUsed}% utilizado — considere fazer upgrade
        </p>
      )}
      {isDanger && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Limite crítico atingido
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

  return (
    <div className="space-y-4">
      <MetricRow
        icon={Users}
        label="Usuários ativos"
        current={initialUsage.usuarios.current}
        limit={initialUsage.usuarios.limit}
        percentUsed={initialUsage.usuarios.percentUsed}
      />
      <MetricRow
        icon={HardDrive}
        label="Armazenamento"
        current={initialUsage.storage.current}
        limit={initialUsage.storage.limit}
        percentUsed={initialUsage.storage.percentUsed}
        formatValue={formatBytes}
      />
    </div>
  );
}
