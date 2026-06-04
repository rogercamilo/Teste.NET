"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Formacao } from "@/types";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  MODALIDADE_LABELS,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clock,
  Eye,
  FileText,
  Hash,
  Layers,
  Link,
  Paperclip,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

const MODALIDADE_ICON: Record<string, string> = {
  presencial: "🏛️",
  online: "💻",
  hibrida: "🔄",
};

export default function FormacaoDetalheClient({
  formacao,
  canEdit,
}: {
  formacao: Formacao;
  canEdit: boolean;
}) {
  const router = useRouter();
  const id = formacao.id;
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!formacao) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="font-medium text-foreground">Formação não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/formacoes")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar às formações
        </Button>
      </div>
    );
  }

  async function handleDelete() {
    if (formacao.documentoAnexoId) {
      fetch(`/api/arquivos/${formacao.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
    }
    await fetch(`/api/formacoes/${id}`, { method: "DELETE" });
    toast.success("Formação excluída.");
    router.replace("/formacoes");
    router.refresh();
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/formacoes")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-xl">
              {MODALIDADE_ICON[formacao.modalidade]}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{formacao.tema}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className={`text-xs ${NIVEL_CORES[formacao.nivelFormativo]}`}>
                  {NIVEL_FORMATIVO_LABELS[formacao.nivelFormativo]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {MODALIDADE_LABELS[formacao.modalidade]}
                </Badge>
                {formacao.eixoNome && (
                  <Badge variant="outline" className="text-xs bg-accent text-accent-foreground border-0">
                    {formacao.eixoNome}
                  </Badge>
                )}
                {formacao.gradeNome && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Layers className="h-3 w-3" />
                    {formacao.gradeNome}
                    {formacao.numero && <span className="ml-0.5 font-mono">#{formacao.numero}</span>}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => router.push(`/formacoes/${id}/editar`)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Excluir
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Formador responsável</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {formacao.formadorNome}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Carga horária</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              {formacao.cargaHoraria}h
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objetivo</p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{formacao.objetivo}</p>
        </div>

        {formacao.descricao && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descrição</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{formacao.descricao}</p>
          </div>
        )}

        {formacao.observacoesFormador && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações do formador</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{formacao.observacoesFormador}</p>
          </div>
        )}

        {formacao.gradeNome && (
          <div className="flex items-center gap-2 text-sm">
            <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Grade:</span>
            <button
              type="button"
              onClick={() => formacao.gradeId && router.push(`/grades/${formacao.gradeId}`)}
              className="font-medium text-primary hover:underline"
            >
              {formacao.gradeNome}
            </button>
            {formacao.numero && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />{formacao.numero}
              </span>
            )}
          </div>
        )}

        {formacao.materialApoio && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Material de apoio</p>
            <p className="text-sm text-foreground flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {formacao.materialApoio}
            </p>
          </div>
        )}

        {formacao.documentoAnexo && formacao.documentoAnexoId && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate">{formacao.documentoAnexo}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 ml-2 h-7 text-xs gap-1 text-primary"
              onClick={() => router.push(`/viewer?arquivoId=${formacao.documentoAnexoId}&nome=${encodeURIComponent(formacao.documentoAnexo!)}&origem=/formacoes/${id}`)}
            >
              <Eye className="h-3 w-3" />
              Ver documento
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>Utilizada {formacao.vezesUtilizada}× em agendamentos</span>
          <span>Cadastrada em {formacao.criadoEm}</span>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir formação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{formacao.tema}</span>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
