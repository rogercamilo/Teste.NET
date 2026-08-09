"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText, Loader2 } from "lucide-react";

interface DocumentoViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  /** URL de pré-visualização (servida inline no iframe). */
  arquivoUrl: string;
  /** URL de download (força attachment). Se ausente, cai em `arquivoUrl`. */
  downloadUrl?: string;
  /**
   * Endpoint JSON (`?url=1`) que resolve a pre-signed URL do R2. Quando
   * informado, o iframe aponta DIRETO para o R2 — o mesmo caminho da página
   * `/viewer`, que carrega com pdf.js nativo. Sem ele, o iframe usa `arquivoUrl`
   * (que pode fazer 302 → R2, aceitável para endpoints sem suporte a `?url=1`).
   */
  previewUrl?: string;
}

export function DocumentoViewer({ open, onOpenChange, nome, arquivoUrl, downloadUrl, previewUrl }: DocumentoViewerProps) {
  const isPdf = nome.toLowerCase().endsWith(".pdf");
  const baixarUrl = downloadUrl ?? arquivoUrl;

  // Com `previewUrl`, resolvemos a assinada uma vez e apontamos o iframe DIRETO
  // ao R2; sem ela, usamos `arquivoUrl` (que pode fazer 302 → R2).
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (!open || !isPdf || !previewUrl) return;
    let cancelled = false;
    fetch(previewUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { url?: string }) => {
        if (cancelled) return;
        if (d.url) setResolvedUrl(d.url);
        else setLoadError(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, isPdf, previewUrl]);

  const iframeSrc = previewUrl ? resolvedUrl : arquivoUrl;
  const showSpinner = isPdf && !loadError && (!iframeSrc || !iframeLoaded);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <DialogTitle className="text-sm font-medium truncate">{nome}</DialogTitle>
          </div>
          <a
            href={baixarUrl}
            download={nome}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted transition-colors mr-7 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Baixar
          </a>
        </div>

        {isPdf ? (
          <div className="relative flex-1">
            {showSpinner && !loadError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Carregando documento…</p>
              </div>
            )}
            {loadError ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
                <FileText className="h-16 w-16 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Não foi possível abrir a pré-visualização.</p>
                <a
                  href={baixarUrl}
                  download={nome}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Baixar arquivo
                </a>
              </div>
            ) : (
              iframeSrc && (
                <iframe
                  src={iframeSrc}
                  className="absolute inset-0 w-full h-full border-0"
                  title={nome}
                  onLoad={() => setIframeLoaded(true)}
                />
              )
            )}
          </div>
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
