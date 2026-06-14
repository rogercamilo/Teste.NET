"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  EIXO_COLORS,
  temPermissao,
  type NivelFormativo,
  type GradeFormativa,
  type GrupoFormacao,
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Eye,
  FileText,
  GitBranch,
  Layers,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

interface GradesClientProps {
  role: string;
  grupoFormacaoId: string | null;
  initialGrades: GradeFormativa[];
  initialGruposFormacao: GrupoFormacao[];
}

export default function GradesClient({ role, grupoFormacaoId, initialGrades, initialGruposFormacao }: GradesClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const canEdit = temPermissao(role, "formador_geral");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<GradeFormativa | null>(null);
  const [page, setPage] = useState(1);

  const meuGrupoFormacao =
    role === "formador_comunitario" && grupoFormacaoId
      ? initialGruposFormacao.find((m) => m.id === grupoFormacaoId)
      : null;
  const nivelRestrito: NivelFormativo | null = meuGrupoFormacao?.nivelFormativo ?? null;
  const visibleGrades = nivelRestrito
    ? initialGrades.filter((g) => g.nivelFormativo === nivelRestrito)
    : initialGrades;

  function openDelete(g: GradeFormativa, e: React.MouseEvent) {
    e.stopPropagation();
    setToDelete(g);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      if (toDelete.documentoAnexoId) {
        fetch(`/api/arquivos/${toDelete.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
      }
      const res = await fetch(`/api/grades/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) return toast.error("Erro ao excluir grade.");
      toast.success("Grade excluída.");
      setDeleteOpen(false);
      setToDelete(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Grades Formativas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {nivelRestrito
              ? `Grades do nível: ${NIVEL_FORMATIVO_LABELS[nivelRestrito]}`
              : "Detalhamento operacional dos planos formativos"}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => router.push("/grades/novo")}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Grade
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-sm text-center">
          <p className="text-xl font-bold text-foreground">{visibleGrades.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Grades ativas</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-sm text-center">
          <p className="text-xl font-bold text-foreground">
            {visibleGrades.reduce((acc, g) => acc + g.eixos.length, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Eixos</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-sm text-center">
          <p className="text-xl font-bold text-foreground">
            {visibleGrades.reduce((acc, g) => acc + g.totalFormacoes, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Formações</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {visibleGrades.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">Nenhuma grade encontrada</p>
          </div>
        )}
        {visibleGrades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((grade) => (
          <Card key={grade.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => router.push(`/grades/${grade.id}`)}
                          className="text-sm font-semibold text-primary hover:underline underline-offset-2 text-left"
                        >
                          {grade.nome}
                        </button>
                        <Badge variant="outline" className={`text-xs ${NIVEL_CORES[grade.nivelFormativo]}`}>
                          {NIVEL_FORMATIVO_LABELS[grade.nivelFormativo]}
                        </Badge>
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          v{grade.versao}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Plano: {grade.planoNome}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/grades/${grade.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {grade.documentoAnexo && grade.documentoAnexoId && (
                          <DropdownMenuItem onClick={() => router.push(`/viewer?arquivoId=${grade.documentoAnexoId}&nome=${encodeURIComponent(grade.documentoAnexo!)}&origem=/grades/${grade.id}`)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver documento
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/grades/${grade.id}/editar`)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={(e) => openDelete(grade, e)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(grade.vigenciaInicio), "MMM yyyy", { locale: ptBR })} —{" "}
                      {format(parseISO(grade.vigenciaFim), "MMM yyyy", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {grade.eixos.length} eixos
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {grade.totalFormacoes} formações
                    </div>
                  </div>

                  {grade.documentoAnexo && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate max-w-xs">{grade.documentoAnexo}</span>
                    </div>
                  )}

                  {grade.eixos.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Eixos Pedagógicos
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {grade.eixos.map((eixo, idx) => (
                          <div
                            key={eixo.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${EIXO_COLORS[idx % EIXO_COLORS.length]}`}
                          >
                            <div className="h-1.5 w-1.5 rounded-full" style={{ background: eixo.cor ?? "#3B82F6" }} />
                            {eixo.nome}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {grade.etapas.length > 0 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Pagination total={visibleGrades.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} className="pt-2" />
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir grade</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{toDelete?.nome}</span>? Esta ação não pode ser desfeita.
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
