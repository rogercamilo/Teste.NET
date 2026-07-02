import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estado vazio com propósito: um ícone com halo clay, um título que convida à
 * ação e uma descrição curta. Os botões são passados como slots (`action` /
 * `secondaryAction`) para que cada lista mantenha seu próprio fluxo de criação e
 * suas regras de permissão — o componente é puramente apresentacional.
 *
 * Convenção de uso nas listas:
 *   - lista genuinamente vazia (1º acesso)  → `action` com o CTA da 1ª ação
 *   - lista vazia por causa de filtro/busca → `secondaryAction` "Limpar filtros"
 */
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** CTA primário (ex.: "Cadastrar primeiro formando"). */
  action?: React.ReactNode;
  /** Ação secundária (ex.: "Limpar filtros"). */
  secondaryAction?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center animate-in fade-in-50 slide-in-from-bottom-1 duration-500",
        className
      )}
    >
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
        {/* halo clay suave — dá calor e profundidade sem competir com o conteúdo */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/10 blur-[2px]"
        />
        <span
          aria-hidden
          className="absolute inset-2 rounded-full bg-primary/10 ring-1 ring-inset ring-primary/15"
        />
        <Icon className="relative h-7 w-7 text-primary/70" strokeWidth={1.75} />
      </div>

      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
