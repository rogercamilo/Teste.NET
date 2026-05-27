"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText } from "lucide-react";

interface DocumentoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  arquivoUrl: string;
}

export function DocumentoViewer({ open, onOpenChange, nome, arquivoUrl }: DocumentoViewerProps) {
  const isPdf = nome.toLowerCase().endsWith(".pdf");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <DialogTitle className="text-sm font-medium truncate">{nome}</DialogTitle>
          </div>
          <a
            href={arquivoUrl}
            download={nome}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted transition-colors mr-7 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </a>
        </div>

        {isPdf ? (
          <iframe
            src={arquivoUrl}
            className="flex-1 w-full border-0"
            title={nome}
          />
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
              href={arquivoUrl}
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
