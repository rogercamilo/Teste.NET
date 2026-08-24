"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GradeFormativa, Formacao, PlanoFormativo } from "@/types";
import { NIVEL_FORMATIVO_LABELS, NIVEL_CORES, EIXO_COLORS, TIPO_FORMACAO_LABELS, isColunaCentral } from "@/types";
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
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  GitBranch,
  Layers,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";


export default function GradeDetalheClient({
  grade,
  linkedFormacoes,
  plano,
  canEdit,
}: {
  grade: GradeFormativa;
  linkedFormacoes: Formacao[];
  plano: PlanoFormativo | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const id = grade.id;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [revisadoEm, setRevisadoEm] = useState<string | undefined>(grade.revisadoEm);
  const [revisadoPor, setRevisadoPor] = useState<string | undefined>(grade.revisadoPor);
  const [revisando, setRevisando] = useState(false);

  async function toggleRevisao() {
    const novo = !revisadoEm;
    setRevisando(true);
    try {
      const res = await fetch(`/api/grades/${id}/revisar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisado: novo }),
      });
      if (!res.ok) { toast.error("Não foi possível atualizar a revisão."); return; }
      const data = await res.json() as { revisadoEm: string | null; revisadoPor: string | null };
      setRevisadoEm(data.revisadoEm ?? undefined);
      setRevisadoPor(data.revisadoPor ?? undefined);
      toast.success(novo ? "Grade marcada como revisada." : "Revisão removida.");
      router.refresh();
    } finally {
      setRevisando(false);
    }
  }

  const eixoNomeToEtapaMap = new Map<string, string>();
  grade.eixos.forEach((e) => {
    const ep = plano?.eixos.find((ep) => ep.id === e.eixoPlanoId);
    eixoNomeToEtapaMap.set(e.nome, ep?.nomeEtapa ?? e.nome);
  });

  function renderTabelaFormacoes(titulo: string, items: Formacao[], showTipo = false) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {titulo} — {items.length} formação{items.length !== 1 ? "ões" : ""}
        </p>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10">N°</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-32">Etapa</th>
                {showTipo && <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-32">Tipo</th>}
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Tema</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell w-56">Objetivo</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell w-56">Obs. do formador</th>
              </tr>
            </thead>
            <tbody>
              {[...items]
                .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999))
                .map((f, idx) => (
                  <tr
                    key={f.id}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => router.push(`/formacoes/${f.id}`)}
                  >
                    <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground">
                      {f.numero ?? idx + 1}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-medium text-foreground">
                        {eixoNomeToEtapaMap.get(f.eixoNome ?? "") ?? f.eixoNome ?? "—"}
                      </span>
                    </td>
                    {showTipo && (
                      <td className="px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">{TIPO_FORMACAO_LABELS[f.tipoFormacao]}</span>
                      </td>
                    )}
                    <td className="px-3 py-2.5 font-medium text-foreground text-sm">
                      {f.tema}
                      {f.origem === "complementar" && (
                        <span className="ml-1.5 text-xs text-amber-600">· complementar</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground line-clamp-2">{f.objetivo || "—"}</p>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground line-clamp-2">{f.observacoesFormador || "—"}</p>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  async function handleDelete() {
    if (grade.documentoAnexoId) {
      fetch(`/api/arquivos/${grade.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
    }
    const res = await fetch(`/api/grades/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Erro ao excluir grade. Tente novamente."); return; }
    toast.success("Grade excluída.");
    router.replace("/grades");
    router.refresh();
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
                  Revisada em {format(parseISO(revisadoEm), "dd/MM/yyyy", { locale: ptBR })}
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
          <div className="space-y-4">
            {/* Espinha do caminho (regra 4): formações comunitárias = coluna central */}
            {renderTabelaFormacoes(
              "Espinha do caminho — Formações Comunitárias",
              linkedFormacoes.filter((f) => isColunaCentral(f.tipoFormacao)),
            )}
            {/* Auxiliares à coluna central: retiros e atividades extras */}
            {renderTabelaFormacoes(
              "Auxiliares — Retiros & atividades",
              linkedFormacoes.filter((f) => !isColunaCentral(f.tipoFormacao)),
              true,
            )}
          </div>
        )}

        {plano?.retiros?.some((r) => r.materialAnexo && r.materialAnexoId) && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Materiais de direcionamento — Retiros
            </p>
            <div className="space-y-2">
              {plano.retiros
                .filter((r) => r.materialAnexo && r.materialAnexoId)
                .sort((a, b) => a.numero - b.numero)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate">
                        {r.numero}º Retiro {r.tipo === "comunitario" ? "Comunitário" : "Pessoal"}{r.tema ? ` — ${r.tema}` : ""}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 ml-2 h-7 text-xs gap-1 text-primary"
                      onClick={() =>
                        router.push(`/viewer?arquivoId=${r.materialAnexoId}&nome=${encodeURIComponent(r.materialAnexo!)}&origem=/grades/${id}`)
                      }
                    >
                      <Eye className="h-3 w-3" />
                      Ver material
                    </Button>
                  </div>
                ))}
            </div>
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
