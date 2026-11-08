import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusCadencia } from "@/lib/acompanhamento-cadencia";

/**
 * Chip compacto do dever de acompanhamento 1:1 — cor + ícone + palavra (nunca só
 * cor), para a lista de formandos (morada e geral). O status é computado no
 * servidor pelo motor único `avaliarCadenciaAcompanhamento`.
 */
export function CadenciaAcompanhamentoChip({
  status,
  diasAtraso,
  className,
}: {
  status: StatusCadencia;
  diasAtraso?: number;
  className?: string;
}) {
  const MAPA: Record<StatusCadencia, { cls: string; Icon: typeof CheckCircle2; label: string }> = {
    em_dia: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2, label: "Acomp. em dia" },
    vence_em_breve: { cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock, label: "Acomp. vence logo" },
    atrasado: {
      cls: "bg-red-50 text-red-700 border-red-200",
      Icon: AlertTriangle,
      label: diasAtraso && diasAtraso > 0 ? `Acomp. atrasado ${diasAtraso}d` : "Acomp. atrasado",
    },
    nunca: { cls: "bg-red-50 text-red-700 border-red-200", Icon: AlertTriangle, label: "Sem acompanhamento" },
  };
  const { cls, Icon, label } = MAPA[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-medium", cls, className)}>
      <Icon className="h-3 w-3 shrink-0" /> {label}
    </span>
  );
}
