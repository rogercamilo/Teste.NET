"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function ViewerContent() {
  const params = useSearchParams();
  const router = useRouter();

  const arquivoId = params.get("arquivoId") ?? "";
  const nome = params.get("nome") ?? "documento";
  const rawOrigem = params.get("origem") ?? "/";
  const origem = rawOrigem.startsWith("/") && !rawOrigem.startsWith("//") ? rawOrigem : "/";

  const isPdf = nome.toLowerCase().endsWith(".pdf");
  // Link de download: mantém o redirect 302 do endpoint (baixa direto do R2).
  const downloadUrl = arquivoId ? `/api/arquivos/${arquivoId}` : "";

  // Visualização de PDF: resolve a URL assinada UMA vez e aponta o <iframe>
  // direto para o R2. Isso tira o app do caminho de transferência e deixa o
  // browser (pdf.js) carregar o PDF com range nativo — abre em ~instantâneo.
  const [pdfUrl, setPdfUrl] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    if (!arquivoId || !isPdf) return;
    let cancelled = false;
    fetch(`/api/arquivos/${arquivoId}?url=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { url?: string }) => {
        if (!cancelled && d.url) setPdfUrl(d.url);
        else if (!cancelled) setLoadError(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [arquivoId, isPdf]);

  const showSpinner = isPdf && !loadError && (!pdfUrl || !iframeLoaded);

  return (
    <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6 flex flex-col overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
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
        {downloadUrl && (
          <a
            href={downloadUrl}
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
        <div className="relative flex-1">
          {showSpinner && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Carregando documento…</p>
            </div>
          )}
          {loadError ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <FileText className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Não foi possível abrir a pré-visualização.</p>
              <a
                href={downloadUrl}
                download={nome}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar arquivo
              </a>
            </div>
          ) : (
            pdfUrl && (
              <iframe
                src={pdfUrl}
                className="absolute inset-0 w-full h-full border-none"
                title={nome}
                onLoad={() => setIframeLoaded(true)}
              />
            )
          )}
        </div>
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
