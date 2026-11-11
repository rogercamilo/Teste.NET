import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { RelatorioDef } from "@/lib/relatorios/catalogo";

/** Card do catálogo: a linha inteira leva ao relatório. */
export function CatalogoCard({ def }: { def: RelatorioDef }) {
  const Icon = def.icone;
  return (
    <Link href={`/relatorios/${def.slug}`} className="group block focus:outline-none">
      <Card className="h-full border-0 shadow-sm transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
            </span>
            <h2 className="text-base font-semibold text-foreground">{def.titulo}</h2>
          </div>
          <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{def.descricao}</p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Abrir relatório
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
