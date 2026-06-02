"use client";

import { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { useTermos } from "@/lib/data-store";

interface UsageMetric {
  current: number;
  limit: number | null;
  percentUsed: number;
}

interface Usage {
  plano: "GRATUITO" | "ESSENCIAL" | "PROFISSIONAL";
  moradas: UsageMetric;
  formandos: UsageMetric;
  storage: UsageMetric;
}

const PLANO_LABELS = { GRATUITO: "Gratuito", ESSENCIAL: "Essencial", PROFISSIONAL: "Profissional" };

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

export default function PlanUsage() {
  const { morada: termoMorada } = useTermos();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/organizacao/uso")
      .then((r) => r.json() as Promise<Usage>)
      .then(setUsage)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (!usage) return null;

  const hasWarning =
    (usage.moradas.percentUsed >= 80 && usage.moradas.limit !== null) ||
    (usage.formandos.percentUsed >= 80 && usage.formandos.limit !== null) ||
    (usage.storage.percentUsed >= 80 && usage.storage.limit !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Uso do plano</span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {PLANO_LABELS[usage.plano]}
        </span>
      </div>

      <div className="space-y-4">
        <UsageBar label={`${termoMorada}s`} metric={usage.moradas} />
        <UsageBar label="Formandos" metric={usage.formandos} />
        <UsageBar label="Armazenamento" metric={usage.storage} formatValue={formatBytes} />
      </div>

      {hasWarning && (
        <div className="pt-2 border-t border-border">
          <a
            href="/configuracoes"
            className="text-xs text-primary hover:underline font-medium"
          >
            Gerenciar plano →
          </a>
        </div>
      )}
    </div>
  );
}
