"use client";

import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// react-pdf é pesado e client-only → carregado sob demanda, fora do bundle inicial.
const PdfCanvas = dynamic(() => import("@/components/documentos/PdfCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm">Carregando visualizador…</p>
    </div>
  ),
});

function ViewerContent() {
  const params = useSearchParams();
  const router = useRouter();

  const arquivoId = params.get("arquivoId") ?? "";
  const nome = params.get("nome") ?? "documento";
  const rawOrigem = params.get("origem") ?? "/";
  const origem = rawOrigem.startsWith("/") && !rawOrigem.startsWith("//") ? rawOrigem : "/";

  const isPdf = nome.toLowerCase().endsWith(".pdf");
  // pdf.js busca os bytes same-origin (`?stream=1`); download força attachment.
  const fileUrl = arquivoId ? `/api/arquivos/${arquivoId}?stream=1` : "";
  const downloadUrl = arquivoId ? `/api/arquivos/${arquivoId}?download=1` : "";

  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => router.push(origem)}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2 text-sm text-foreground font-medium truncate">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{nome}</span>
          </div>
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={nome}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border border-border bg-background hover:bg-muted transition-colors shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </a>
        )}
      </div>

      {/* Content */}
      {!arquivoId ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground">
          <FileText className="h-12 w-12 opacity-30" />
          <p className="text-sm">Documento não encontrado.</p>
        </div>
      ) : isPdf ? (
        <PdfCanvas fileUrl={fileUrl} downloadUrl={downloadUrl} nome={nome} />
      ) : (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center px-4">
          <FileText className="h-16 w-16 text-muted-foreground/30" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">{nome}</p>
            <p className="text-sm text-muted-foreground">
              Este formato não pode ser visualizado diretamente no navegador.
            </p>
          </div>
          <a
            href={downloadUrl}
            download={nome}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Baixar arquivo
          </a>
        </div>
      )}
    </div>
  );
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground text-sm">Carregando…</div>}>
      <ViewerContent />
    </Suspense>
  );
}
