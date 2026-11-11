"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, FileBarChart, Home } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RelatorioView } from "@/components/relatorios/views";
import { PERIODOS_RELATORIO, type RelatorioSlug } from "@/lib/relatorios/catalogo";
import type { RelatorioMeta, ResultadoRelatorio } from "@/lib/relatorios/carregar";
import { cn } from "@/lib/utils";

interface Props {
  slug: RelatorioSlug;
  titulo: string;
  escopo: "morada" | "org";
  periodoDias: number;
  moradaId: string | null;
  meta: RelatorioMeta | null;
  resultado: ResultadoRelatorio | null;
  erro: boolean;
}

export default function RelatorioClient({ slug, titulo, escopo, periodoDias, moradaId, meta, resultado, erro }: Props) {
  const router = useRouter();
  const temPeriodo = slug !== "executivo";
  const moradas = meta?.moradasDisponiveis;
  const mostrarFiltroMorada = escopo === "morada" && !!moradas;

  function navegar(next: { periodo?: number; morada?: string | null }) {
    const p = new URLSearchParams();
    const periodo = next.periodo ?? periodoDias;
    const morada = next.morada !== undefined ? next.morada : moradaId;
    if (temPeriodo) p.set("periodo", String(periodo));
    if (morada) p.set("morada", morada);
    router.push(`/relatorios/${slug}?${p.toString()}`);
  }

  function urlExport(formato: "pdf" | "csv"): string {
    const p = new URLSearchParams();
    if (temPeriodo) p.set("periodo", String(periodoDias));
    if (moradaId) p.set("morada", moradaId);
    p.set("formato", formato);
    return `/api/relatorios/export/${slug}?${p.toString()}`;
  }

  const subtituloPartes = [
    meta?.moradaNome,
    temPeriodo ? PERIODOS_RELATORIO.find((x) => x.dias === periodoDias)?.label : null,
  ].filter(Boolean);

  const podeExportar = !!resultado;

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="space-y-3">
        <Link href="/relatorios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Relatórios
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-title text-foreground">{titulo}</h1>
            {subtituloPartes.length > 0 && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtituloPartes.join(" · ")}</p>
            )}
          </div>
          {podeExportar && (
            <div className="flex shrink-0 gap-2">
              <a href={urlExport("pdf")} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <FileText className="mr-1.5 h-4 w-4" aria-hidden />
                PDF
              </a>
              <a href={urlExport("csv")} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                <Download className="mr-1.5 h-4 w-4" aria-hidden />
                CSV
              </a>
            </div>
          )}
        </div>

        {/* Filtros */}
        {(temPeriodo || mostrarFiltroMorada) && (
          <div className="flex flex-wrap items-center gap-2">
            {mostrarFiltroMorada && (
              <Select value={moradaId ?? ""} onValueChange={(v) => navegar({ morada: v || null })}>
                <SelectTrigger className="h-9 w-56" aria-label="Filtrar por morada">
                  <SelectValue placeholder="Escolher morada…">
                    {moradas!.find((m) => m.id === moradaId)?.nome}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {moradas!.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {temPeriodo && (
              <Select value={String(periodoDias)} onValueChange={(v) => navegar({ periodo: Number(v) })}>
                <SelectTrigger className="h-9 w-48" aria-label="Período">
                  <SelectValue>{PERIODOS_RELATORIO.find((x) => x.dias === periodoDias)?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS_RELATORIO.map((p) => (
                    <SelectItem key={p.dias} value={String(p.dias)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {/* Corpo — trata os 4 estados */}
      {erro ? (
        <EmptyState icon={FileBarChart} title="Não foi possível gerar o relatório" description="Ocorreu um erro ao buscar os dados. Tente novamente em instantes." />
      ) : meta?.semMorada ? (
        <EmptyState icon={Home} title="Sem morada vinculada" description="Você ainda não está vinculado a uma morada, então não há acompanhamento para exibir." />
      ) : meta?.precisaSelecionarMorada ? (
        <EmptyState icon={Home} title="Escolha uma morada" description="Selecione a morada acima para gerar este relatório." />
      ) : resultado ? (
        <RelatorioView resultado={resultado} />
      ) : (
        <EmptyState icon={FileBarChart} title="Sem dados" description="Não há dados para os filtros selecionados." />
      )}
    </div>
  );
}
