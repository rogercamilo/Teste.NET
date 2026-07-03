import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Primitivas de skeleton para os `loading.tsx` de rota (App Router).
 * Compõem o `Skeleton` base e espelham o layout real das páginas
 * (wrapper `space-y-6`, header com título + ação, grids/listas) para
 * eliminar o "pulo" de layout quando o conteúdo real chega.
 */

export function PageSkeleton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6 animate-in-fast", className)} aria-hidden="true">
      {children}
    </div>
  );
}

/** Título + subtítulo, com bloco de ação opcional à direita. */
export function PageHeaderSkeleton({
  action = true,
  subtitle = true,
}: {
  action?: boolean;
  subtitle?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        {subtitle && <Skeleton className="h-4 w-72 max-w-[70vw]" />}
      </div>
      {action && <Skeleton className="h-9 w-32 shrink-0" />}
    </div>
  );
}

/** Linha de filtros (busca + selects). */
export function FiltersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Skeleton className="h-9 w-full sm:w-64" />
      {Array.from({ length: count - 1 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full sm:w-40" />
      ))}
    </div>
  );
}

/** Faixa de KPIs (cards com rótulo + número). */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Grade de cards de conteúdo (formandos, grupos, planos…). */
export function CardGridSkeleton({
  count = 8,
  withAvatar = false,
}: {
  count?: number;
  withAvatar?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {withAvatar && <Skeleton className="h-11 w-11 rounded-full shrink-0" />}
              <div className="space-y-2 flex-1 min-w-0">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Lista vertical de linhas (agenda, notificações, itens simples). */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3 max-w-full" />
            </div>
            <Skeleton className="h-8 w-20 shrink-0" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Tabela (presença, listagens tabulares). */
export function TableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          <div className="flex items-center gap-4 p-4">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className={cn("h-4", i === 0 ? "w-40 flex-1" : "w-20")} />
            ))}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="flex items-center gap-4 p-4">
              {Array.from({ length: cols }).map((_, i) => (
                <Skeleton key={i} className={cn("h-4", i === 0 ? "w-40 flex-1" : "w-20")} />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Página de detalhe: cabeçalho + duas colunas de conteúdo. */
export function DetailSkeleton() {
  return (
    <PageSkeleton>
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="space-y-2 flex-1 min-w-0">
          <Skeleton className="h-7 w-56 max-w-[70vw]" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full max-w-md" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-4 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      </div>
    </PageSkeleton>
  );
}
