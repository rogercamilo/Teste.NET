"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Download, FileText, Loader2, Minus, Plus } from "lucide-react";

// Worker do pdf.js servido same-origin (emitido pelo bundler). Cobre CSP worker-src 'self'.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

// Standard fonts (Helvetica etc.) copiados para public/ — ver scripts/copy-pdf-assets.mjs.
const PDF_OPTIONS = { standardFontDataUrl: "/pdfjs/standard_fonts/" } as const;

const MAX_PAGE_WIDTH = 820; // largura-base do papel; zoom multiplica
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.2;

export default function PdfCanvas({
  fileUrl,
  downloadUrl,
  nome,
}: {
  fileUrl: string;
  /** URL de download. Ausente → modo somente-leitura (sem botão de baixar no erro). */
  downloadUrl?: string;
  nome: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageEls = useRef<Array<HTMLDivElement | null>>([]);
  const [numPages, setNumPages] = useState(0);
  const [current, setCurrent] = useState(1);
  const [baseWidth, setBaseWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState(false);

  // Largura-base = largura disponível (menos respiro), limitada ao papel.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      setBaseWidth(Math.min(w - 24, MAX_PAGE_WIDTH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Página atual = a mais visível no scroll (indicador "x de N").
  useEffect(() => {
    if (!numPages || !scrollRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best = 0;
        let bestRatio = 0;
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > bestRatio) {
            bestRatio = e.intersectionRatio;
            best = Number((e.target as HTMLElement).dataset.page ?? 0);
          }
        }
        if (best) setCurrent(best);
      },
      { root: scrollRef.current, threshold: [0.3, 0.6] },
    );
    pageEls.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [numPages]);

  const onLoad = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    pageEls.current = new Array(n).fill(null);
  }, []);

  const pageWidth = baseWidth > 0 ? baseWidth * zoom : undefined;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Barra própria: página + zoom (on-brand, sem chrome do navegador) */}
      <div className="flex items-center justify-between gap-3 px-4 py-1.5 border-b border-border/50 bg-background/80 shrink-0">
        <span className="text-xs text-muted-foreground tabular-nums">
          {numPages ? `Página ${current} de ${numPages}` : "—"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
            aria-label="Diminuir zoom"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums w-10 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
            aria-label="Aumentar zoom"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Área rolável com as páginas renderizadas em canvas */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto bg-muted/40">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center px-6">
            <FileText className="h-14 w-14 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Não foi possível abrir a pré-visualização.</p>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={nome}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                Baixar arquivo
              </a>
            )}
          </div>
        ) : (
          <Document
            file={fileUrl}
            options={PDF_OPTIONS}
            onLoadSuccess={onLoad}
            onLoadError={() => setError(true)}
            loading={
              <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">Carregando documento…</p>
              </div>
            }
            error={
              <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-2 text-muted-foreground">
                <FileText className="h-10 w-10 opacity-30" />
                <p className="text-sm">Falha ao carregar o documento.</p>
              </div>
            }
            className="flex flex-col items-center gap-4 py-4"
          >
            {Array.from({ length: numPages }, (_, i) => (
              <div
                key={i}
                data-page={i + 1}
                ref={(el) => { pageEls.current[i] = el; }}
                className="shadow-md ring-1 ring-black/5"
              >
                <Page
                  pageNumber={i + 1}
                  width={pageWidth}
                  loading={
                    <div
                      className="flex items-center justify-center bg-white"
                      style={{ width: pageWidth, height: pageWidth ? pageWidth * 1.414 : 400 }}
                    >
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
                    </div>
                  }
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
