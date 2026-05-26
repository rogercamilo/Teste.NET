"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

function ViewerContent() {
  const params = useSearchParams();
  const router = useRouter();

  const arquivoId = params.get("arquivoId") ?? "";
  const nome = params.get("nome") ?? "documento";
  const rawOrigem = params.get("origem") ?? "/";
  const origem = rawOrigem.startsWith("/") && !rawOrigem.startsWith("//") ? rawOrigem : "/";

  const isPdf = nome.toLowerCase().endsWith(".pdf");
  const fileUrl = arquivoId ? `/api/arquivos/${arquivoId}` : "";

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(origem)}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2 text-sm text-foreground font-medium truncate max-w-96">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{nome}</span>
          </div>
        </div>
        {fileUrl && (
          <a
            href={fileUrl}
            download={nome}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm font-medium border border-border bg-background hover:bg-muted transition-colors"
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
        <iframe
          src={fileUrl}
          className="flex-1 w-full border-none"
          title={nome}
        />
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
            href={fileUrl}
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
