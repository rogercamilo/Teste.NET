"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTermos } from "@/lib/data-store";
import type { Formacao } from "@/types";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  MODALIDADE_LABELS,
  TIPO_FORMACAO_LABELS,
  TIPO_FORMACAO_CORES,
  STATUS_REALIZACAO_LABELS,
  isColunaCentral,
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
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Eye,
  Hash,
  Info,
  Layers,
  Link,
  Monitor,
  Paperclip,
  Pencil,
  Route,
  Trash2,
  User,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import { toast } from "sonner";

export type Realizacao = {
  id: string;
  data: string; // YYYY-MM-DD
  status: string;
  formadorNome: string;
  participantes: number;
};

const MODALIDADE_ICON: Record<string, ComponentType<LucideProps>> = {
  presencial: Building2,
  online: Monitor,
  hibrida: Layers,
};

function ModalidadeIcon({ modalidade, ...props }: { modalidade: string } & LucideProps) {
  const Icon = MODALIDADE_ICON[modalidade] ?? Layers;
  return <Icon aria-hidden {...props} />;
}

/** Exibe YYYY-MM-DD como dd/MM/yyyy sem cruzar fuso (data-only). */
function fmtData(d: string): string {
  return d.split("-").reverse().join("/");
}

export default function FormacaoDetalheClient({
  formacao,
  realizacoes,
  canEdit,
}: {
  formacao: Formacao;
  realizacoes: Realizacao[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { formador: termoFormador, formando: termoFormando } = useTermos();
  const id = formacao.id;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [revisadoEm, setRevisadoEm] = useState<string | undefined>(formacao.revisadoEm);
  const [revisadoPor, setRevisadoPor] = useState<string | undefined>(formacao.revisadoPor);
  const [revisando, setRevisando] = useState(false);

  const isPontual = !formacao.gradeId;

  async function toggleRevisao() {
    const novo = !revisadoEm;
    setRevisando(true);
    try {
      const res = await fetch(`/api/formacoes/${id}/revisar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisado: novo }),
      });
      if (!res.ok) { toast.error("Não foi possível atualizar a revisão."); return; }
      const data = await res.json() as { revisadoEm: string | null; revisadoPor: string | null };
      setRevisadoEm(data.revisadoEm ?? undefined);
      setRevisadoPor(data.revisadoPor ?? undefined);
      toast.success(novo ? "Formação marcada como revisada." : "Revisão removida.");
      router.refresh();
    } finally {
      setRevisando(false);
    }
  }

  async function handleDelete() {
    if (formacao.documentoAnexoId) {
      fetch(`/api/arquivos/${formacao.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
    }
    if (formacao.materialFormadorAnexoId) {
      fetch(`/api/arquivos/${formacao.materialFormadorAnexoId}`, { method: "DELETE" }).catch(() => null);
    }
    const res = await fetch(`/api/formacoes/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao excluir formação. Tente novamente."); return; }
    toast.success("Formação excluída.");
    router.replace("/formacoes");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/formacoes")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* ── Nota: o que é esta formação e o ganho para o formador ───────── */}
      <div className="flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            O que você encontra nesta formação?
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Esta tela reúne tudo sobre uma unidade de conteúdo: objetivo, posição no
            caminho formativo (plano → grade → eixo) ou registro como pontual, materiais
            para quem ministra e para o {termoFormando.toLowerCase()}, e o histórico de realizações. Para o
            {" "}{termoFormador.toLowerCase()}, é a referência pronta na hora de preparar e conduzir o encontro —
            e o comprovante de tudo que já foi trabalhado com a comunidade.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              <ModalidadeIcon modalidade={formacao.modalidade} className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{formacao.tema}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className={`text-xs ${TIPO_FORMACAO_CORES[formacao.tipoFormacao]}`}>
                  {isColunaCentral(formacao.tipoFormacao) ? "Central" : "Auxiliar"} · {TIPO_FORMACAO_LABELS[formacao.tipoFormacao]}
                </Badge>
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
                {formacao.gradeNome ? (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Layers className="h-3 w-3" />
                    {formacao.gradeNome}
                    {formacao.numero && <span className="ml-0.5 font-mono">#{formacao.numero}</span>}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Formação pontual
                  </Badge>
                )}
                {formacao.gradeNome && formacao.origem === "complementar" && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Complementar ao plano
                  </Badge>
                )}
                {revisadoEm ? (
                  <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Revisada
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-200 gap-1">
                    <Clock className="h-3 w-3" />
                    Não revisada
                  </Badge>
                )}
              </div>
              {revisadoEm && (
                <p className="text-xs text-muted-foreground mt-1">
                  Revisada em {fmtData(revisadoEm.split("T")[0])}
                  {revisadoPor ? ` por ${revisadoPor}` : ""}
                </p>
              )}
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={revisadoEm ? "outline" : "default"}
                size="sm"
                onClick={toggleRevisao}
                disabled={revisando}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {revisadoEm ? "Desfazer revisão" : "Marcar como revisada"}
              </Button>
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
            <p className="text-xs text-muted-foreground mb-0.5">Caminho formativo</p>
            {formacao.gradeNome ? (
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Route className="h-3.5 w-3.5 text-muted-foreground" />
                {formacao.planoNome ? `${formacao.planoNome} → ` : ""}{formacao.gradeNome}
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">Pontual (fora do caminho)</p>
            )}
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

        {/* ── Governança da formação pontual (G5) ── */}
        {isPontual && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Registro & realização</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Identificador</p>
                <p className="font-medium">{formacao.codigo || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Responsável institucional</p>
                <p className="font-medium">{formacao.responsavelInstitucional || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data de realização</p>
                <p className="font-medium">{formacao.dataRealizacao ? fmtData(formacao.dataRealizacao) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">{STATUS_REALIZACAO_LABELS[formacao.statusRealizacao]}</p>
              </div>
            </div>
            {formacao.contextoRealizacao && (
              <div>
                <p className="text-xs text-muted-foreground">Contexto</p>
                <p className="text-sm whitespace-pre-line">{formacao.contextoRealizacao}</p>
              </div>
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

        {formacao.materialFormadorAnexo && formacao.materialFormadorAnexoId && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Material para o formador · uso interno</p>
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground truncate">{formacao.materialFormadorAnexo}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 ml-2 h-7 text-xs gap-1 text-primary"
                onClick={() => router.push(`/viewer?arquivoId=${formacao.materialFormadorAnexoId}&nome=${encodeURIComponent(formacao.materialFormadorAnexo!)}&origem=/formacoes/${id}`)}
              >
                <Eye className="h-3 w-3" />
                Ver documento
              </Button>
            </div>
          </div>
        )}

        {formacao.documentoAnexo && formacao.documentoAnexoId && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Material para o formando · disponível no Portal</p>
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
          </div>
        )}

        {/* ── Realizações auditáveis (G6) ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <CalendarCheck className="h-3.5 w-3.5" />
            Realizações — {realizacoes.length} agendamento{realizacoes.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground/90 leading-relaxed">
            Cada vez que esta formação é agendada na agenda, entra aqui com data,
            ministrante e presença. É o histórico auditável do que foi de fato
            realizado — sem planilha paralela, o formador acompanha a frequência do
            conteúdo e a comunidade ganha um registro fiel da caminhada.
          </p>
          {realizacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não foi agendada na agenda.</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-28">Data</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Ministrante</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-24">Presentes</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {realizacoes.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{fmtData(r.data)}</td>
                      <td className="px-3 py-2 text-sm flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {r.formadorNome}
                      </td>
                      <td className="px-3 py-2 text-sm text-muted-foreground">{r.participantes}</td>
                      <td className="px-3 py-2 text-xs capitalize text-muted-foreground">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-border/60 flex items-center justify-end text-xs text-muted-foreground">
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
