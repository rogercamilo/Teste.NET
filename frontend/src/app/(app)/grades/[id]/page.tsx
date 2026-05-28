"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGrades, useFormacoes } from "@/lib/data-store";
import { NIVEL_FORMATIVO_LABELS, NIVEL_CORES, MODALIDADE_LABELS, type Formacao } from "@/types";
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
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  GitBranch,
  Layers,
  Paperclip,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const EIXO_COLORS = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

const MODALIDADE_ICON: Record<string, string> = {
  presencial: "🏛️",
  online: "💻",
  hibrida: "🔄",
};

function FormacaoRow({
  formacao,
  onNavigate,
}: {
  formacao: Formacao;
  onNavigate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors group"
    >
      <span className="text-base shrink-0">{MODALIDADE_ICON[formacao.modalidade]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {formacao.tema}
        </p>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {formacao.formadorNome || "—"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formacao.cargaHoraria}h
          </span>
          <span>{MODALIDADE_LABELS[formacao.modalidade]}</span>
        </div>
      </div>
    </button>
  );
}

export default function GradeDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "formador_comunitario";
  const canEdit = role !== "formador_comunitario";

  const [grades, setGrades] = useGrades();
  const [formacoes] = useFormacoes();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const grade = grades.find((g) => g.id === id);
  const linkedFormacoes = formacoes.filter((f) => f.gradeId === id);

  if (!grade) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="font-medium text-foreground">Grade não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/grades")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Voltar às grades
        </Button>
      </div>
    );
  }

  function handleDelete() {
    if (grade?.documentoAnexoId) {
      fetch(`/api/arquivos/${grade.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
    }
    setGrades((prev) => prev.filter((g) => g.id !== id));
    toast.success("Grade excluída.");
    router.push("/grades");
  }

  return (
    <div className="max-w-3xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/grades")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{grade.nome}</h1>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className={`text-xs ${NIVEL_CORES[grade.nivelFormativo]}`}>
                  {NIVEL_FORMATIVO_LABELS[grade.nivelFormativo]}
                </Badge>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-border text-xs text-muted-foreground bg-muted">
                  v{grade.versao}
                </span>
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => router.push(`/grades/${id}/editar`)}>
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
            <p className="text-xs text-muted-foreground mb-0.5">Plano vinculado</p>
            <p className="text-sm font-medium">{grade.planoNome || "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Período de vigência</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {format(parseISO(grade.vigenciaInicio), "MMM yyyy", { locale: ptBR })} — {format(parseISO(grade.vigenciaFim), "MMM yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Eixos pedagógicos</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              {grade.eixos.length} eixos
            </p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Formações vinculadas</p>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              {linkedFormacoes.length} formações
            </p>
          </div>
        </div>

        {grade.objetivos && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Objetivos</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{grade.objetivos}</p>
          </div>
        )}

        {grade.fundamentacao && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fundamentação</p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{grade.fundamentacao}</p>
          </div>
        )}

        {grade.eixos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Eixos Pedagógicos</p>
            <div className="flex flex-wrap gap-2">
              {grade.eixos.map((eixo, idx) => (
                <div
                  key={eixo.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${EIXO_COLORS[idx % EIXO_COLORS.length]}`}
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: eixo.cor ?? "#3B82F6" }} />
                  {eixo.nome}
                  {eixo.descricao && <span className="opacity-70">— {eixo.descricao}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {grade.etapas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Etapas</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {grade.etapas.map((etapa, idx) => (
                <div key={etapa.id} className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{etapa.nome}</span>
                    <span>· {etapa.cargaHoraria}h</span>
                  </div>
                  {idx < grade.etapas.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {linkedFormacoes.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Formações desta grade
            </p>
            {grade.eixos.length > 0 ? (
              grade.eixos.map((eixo, eixoIdx) => {
                const porEixo = linkedFormacoes.filter((f) => f.eixoNome === eixo.nome);
                if (porEixo.length === 0) return null;
                return (
                  <div key={eixo.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: eixo.cor ?? "#3B82F6" }}
                      />
                      <span className="text-xs font-medium text-muted-foreground">{eixo.nome}</span>
                    </div>
                    {porEixo.map((f) => (
                      <FormacaoRow key={f.id} formacao={f} onNavigate={() => router.push(`/formacoes/${f.id}`)} />
                    ))}
                  </div>
                );
              })
            ) : (
              linkedFormacoes.map((f) => (
                <FormacaoRow key={f.id} formacao={f} onNavigate={() => router.push(`/formacoes/${f.id}`)} />
              ))
            )}
          </div>
        )}

        {grade.documentoAnexo && grade.documentoAnexoId && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate">{grade.documentoAnexo}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 ml-2 h-7 text-xs gap-1 text-primary"
              onClick={() => router.push(`/viewer?arquivoId=${grade.documentoAnexoId}&nome=${encodeURIComponent(grade.documentoAnexo!)}&origem=/grades/${id}`)}
            >
              <Eye className="h-3 w-3" />
              Ver documento
            </Button>
          </div>
        )}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir grade</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{grade.nome}</span>? Esta ação não pode ser desfeita.
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
