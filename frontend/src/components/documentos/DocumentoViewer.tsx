"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

interface DocumentoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  dataUrl: string;
}

function dataUrlToBlobUrl(dataUrl: string): string {
  try {
    const [header, base64] = dataUrl.split(",");
    const mimeMatch = header.match(/:(.*?);/);
    if (!mimeMatch || !base64) return dataUrl;
    const mimeType = mimeMatch[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return dataUrl;
  }
}

export function DocumentoViewer({ open, onOpenChange, nome, dataUrl }: DocumentoViewerProps) {
  const [blobUrl, setBlobUrl] = useState("");
  const isPdf =
    dataUrl.includes("application/pdf") || nome.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    if (open && dataUrl) {
      const url = dataUrlToBlobUrl(dataUrl);
      setBlobUrl(url);
      return () => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      };
    }
  }, [open, dataUrl]);

  function handleDownload() {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = nome;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <DialogTitle className="text-sm font-medium truncate">{nome}</DialogTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="h-7 shrink-0 gap-1.5 mr-7"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </Button>
        </div>

        {isPdf && blobUrl ? (
          <iframe
            src={blobUrl}
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
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Baixar arquivo
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
