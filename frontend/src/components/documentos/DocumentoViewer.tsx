"use client";

import dynamic from "next/dynamic";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText, Loader2 } from "lucide-react";

// react-pdf é pesado e client-only → carregado sob demanda, fora do bundle inicial.
const PdfCanvas = dynamic(() => import("./PdfCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm">Carregando visualizador…</p>
    </div>
  ),
});

interface DocumentoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  /** URL SAME-ORIGIN dos bytes (`?stream=1`) — o pdf.js busca daqui, sem CORS. */
  fileUrl: string;
  /** URL de download (`?download=1`, força attachment). Cai em `fileUrl` se ausente. */
  downloadUrl?: string;
}

export function DocumentoViewer({ open, onOpenChange, nome, fileUrl, downloadUrl }: DocumentoViewerProps) {
  const isPdf = nome.toLowerCase().endsWith(".pdf");
  const baixarUrl = downloadUrl ?? fileUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex flex-col p-0 gap-0 overflow-hidden w-screen h-[100dvh] max-w-none rounded-none sm:w-[95vw] sm:h-[90vh] sm:max-w-5xl sm:rounded-lg"
      >
        <div className="flex items-center justify-between gap-4 px-4 sm:px-5 py-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <DialogTitle className="text-sm font-medium truncate">{nome}</DialogTitle>
          </div>
          <a
            href={baixarUrl}
            download={nome}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted transition-colors mr-7 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </a>
        </div>

        {isPdf ? (
          <PdfCanvas fileUrl={fileUrl} downloadUrl={baixarUrl} nome={nome} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <FileText className="h-16 w-16 text-muted-foreground/30" />
            <div>
              <p className="font-medium text-foreground">{nome}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pré-visualização não disponível para este formato.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Faça o download para abrir o arquivo.
              </p>
            </div>
            <a
              href={baixarUrl}
              download={nome}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="h-4 w-4" />
              Baixar arquivo
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
