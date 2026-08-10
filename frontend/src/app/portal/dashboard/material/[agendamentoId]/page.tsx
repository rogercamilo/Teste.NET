"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidId } from "@/lib/schemas";

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

/**
 * Visualizador SOMENTE LEITURA do material da formação no Portal do Formando.
 * Renderiza o PDF em canvas (react-pdf), o mesmo motor do visualizador interno
 * da aplicação — comportamento idêntico em desktop e mobile, sem a barra nativa
 * do leitor do navegador. Diferença proposital: NÃO passamos `downloadUrl`, então
 * não há botão de baixar — o material fica só para consulta. (PDF entregue ao
 * browser é sempre, no limite, salvável; isto remove a affordance de download.)
 */
function ViewerContent() {
  const params = useParams<{ agendamentoId: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const agendamentoId = params.agendamentoId ?? "";
  const nome = search.get("nome") ?? "Material da formação";
  const valido = isValidId(agendamentoId);
  const isPdf = nome.toLowerCase().endsWith(".pdf");
  const fileUrl = valido ? `/api/portal/formacoes/${agendamentoId}/material` : "";

  return (
    <div className="flex flex-col overflow-hidden bg-background" style={{ height: "100dvh" }}>
      {/* Toolbar — sem ação de download (somente leitura) */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => router.push("/portal/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{nome}</span>
        </div>
      </div>

      {/* Conteúdo */}
      {!valido ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
          <FileText className="h-12 w-12 opacity-30" />
          <p className="text-sm">Material não encontrado.</p>
        </div>
      ) : isPdf ? (
        <PdfCanvas fileUrl={fileUrl} nome={nome} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
          <FileText className="h-16 w-16 opacity-30" />
          <p className="text-sm">
            Este formato não pode ser visualizado diretamente no navegador.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PortalMaterialViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Carregando…
        </div>
      }
    >
      <ViewerContent />
    </Suspense>
  );
}
