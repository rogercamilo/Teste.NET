"use client";

import { Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isValidId } from "@/lib/schemas";

/**
 * Visualizador SOMENTE LEITURA do material da formação no Portal do Formando.
 * Usa o mesmo mecanismo do visualizador interno da aplicação (`/viewer`): um
 * `<iframe>` que embute o PDF servido pela rota autorizada do portal
 * (`/api/portal/formacoes/[agendamentoId]/material`). Diferença proposital em
 * relação ao viewer da equipe: NÃO há botão de baixar — o material fica só para
 * consulta. `#toolbar=0` esconde a barra nativa do leitor de PDF do navegador
 * (que traria baixar/imprimir); não é um controle rígido — PDF entregue ao
 * browser é sempre, no limite, salvável —, mas remove a affordance de download.
 */
function ViewerContent() {
  const params = useParams<{ agendamentoId: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const agendamentoId = params.agendamentoId ?? "";
  const nome = search.get("nome") ?? "Material da formação";
  const valido = isValidId(agendamentoId);
  const fileUrl = valido ? `/api/portal/formacoes/${agendamentoId}/material#toolbar=0` : "";

  return (
    <div className="flex flex-col overflow-hidden bg-background" style={{ height: "100dvh" }}>
      {/* Toolbar — sem ação de download (somente leitura) */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
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
      ) : (
        <iframe src={fileUrl} className="w-full flex-1 border-none" title={nome} />
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
