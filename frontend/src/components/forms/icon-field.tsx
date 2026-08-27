"use client";

/**
 * Linha de campo no estilo Google Agenda: ícone à esquerda + rótulo opcional +
 * controle + dica opcional. Primitiva genérica compartilhada pelos formulários
 * (Agenda, Período Vocacional, …) para manter o mesmo alinhamento visual.
 */
import type { ComponentType, ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function IconField({
  icon: Icon,
  label,
  required,
  hint,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        {label && (
          <Label>
            {label}
            {required && <span className="text-destructive"> *</span>}
          </Label>
        )}
        {children}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
