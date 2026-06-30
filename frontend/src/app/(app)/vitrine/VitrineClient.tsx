"use client";

import { useState } from "react";
import { FileText, ExternalLink, Stamp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ITENS_VITRINE, type ItemVitrine } from "@/lib/vitrine";

export default function VitrineClient() {
  const [selecionado, setSelecionado] = useState<ItemVitrine>(ITENS_VITRINE[0]);
  const previewSrc = `/api/vitrine/${selecionado.tipo}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      {/* Cabeçalho */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Stamp className="size-4" />
          Modelos da Jornada Vocacional
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Vitrine de Documentos</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Conheça os documentos canônicos que a plataforma gera automaticamente ao longo da jornada
          formativa. Os modelos abaixo usam <strong>dados fictícios</strong> e exibem a marca d&apos;água{" "}
          <strong>&ldquo;MODELO — SEM VALIDADE&rdquo;</strong>; os documentos reais são gerados com os dados
          da sua comunidade.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Lista de modelos */}
        <div className="flex flex-col gap-2">
          {ITENS_VITRINE.map((item) => {
            const ativo = item.tipo === selecionado.tipo;
            return (
              <button
                key={item.tipo}
                type="button"
                onClick={() => setSelecionado(item)}
                aria-pressed={ativo}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                  ativo
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-card hover:bg-muted/50"
                }`}
              >
                <span
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md ${
                    ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <FileText className="size-4.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight">{item.label}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {item.descricao}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Preview */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold">{selecionado.label}</h2>
              <p className="text-xs text-muted-foreground">Pré-visualização do modelo</p>
            </div>
            <a
              href={previewSrc}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ExternalLink className="size-3.5" />
              Abrir em nova aba
            </a>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
            <iframe
              key={selecionado.tipo}
              src={previewSrc}
              title={`Modelo: ${selecionado.label}`}
              className="h-[70vh] min-h-[480px] w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
