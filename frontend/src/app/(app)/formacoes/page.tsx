"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useFormacoes, useGrades } from "@/lib/data-store";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  MODALIDADE_LABELS,
  type Formacao,
  type NivelFormativo,
  type Modalidade,
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportModal, type ImportResult } from "@/components/import/ImportModal";
import {
  BookOpen,
  Clock,
  Eye,
  FileText,
  Filter,
  GitBranch,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";

const MODALIDADE_ICON: Record<Modalidade, string> = {
  presencial: "🏛️",
  online: "💻",
  hibrida: "🔄",
};

const formacoesFields = [
  { key: "tema", label: "Tema da Formação", required: true, example: "Identidade em Cristo" },
  { key: "objetivo", label: "Objetivo", required: true, example: "Apresentar ao formando..." },
  { key: "nivelFormativo", label: "Etapa Formativa", required: true, example: "discipulado" },
  { key: "formadorNome", label: "Formador Responsável", required: true, example: "Maria Silva" },
  { key: "cargaHoraria", label: "Carga Horária (h)", required: true, example: "2" },
  { key: "modalidade", label: "Modalidade", required: false, example: "presencial" },
  { key: "eixoNome", label: "Eixo", required: false, example: "Identidade" },
  { key: "descricao", label: "Descrição", required: false, example: "Reflexão sobre..." },
];

async function importarFormacoes(data: Record<string, string>[]): Promise<ImportResult> {
  await new Promise((r) => setTimeout(r, 1500));
  const errors = data
    .map((row, i) => {
      if (!row.tema) return { row: i + 2, message: "Tema é obrigatório" };
      if (!row.cargaHoraria || isNaN(Number(row.cargaHoraria)))
        return { row: i + 2, message: "Carga horária deve ser um número" };
      return null;
    })
    .filter(Boolean) as { row: number; message: string }[];
  return { success: data.length - errors.length, errors };
}

export default function FormacoesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role ?? "formador_comunitario";
  const canEdit = userRole === "formador_geral" || userRole === "administrador";

  const [formacoes, setFormacoes] = useFormacoes();
  const [grades] = useGrades();
  const [search, setSearch] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [gradeFilter, setGradeFilter] = useState<string>("todas");
  const [importOpen, setImportOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Formacao | null>(null);

  const filtered = formacoes.filter((f) => {
    const matchSearch =
      f.tema.toLowerCase().includes(search.toLowerCase()) ||
      f.formadorNome.toLowerCase().includes(search.toLowerCase());
    const matchNivel = nivelFilter === "todos" || f.nivelFormativo === nivelFilter;
    const matchGrade =
      gradeFilter === "todas"
        ? true
        : gradeFilter === "sem-grade"
        ? !f.gradeId
        : f.gradeId === gradeFilter;
    return matchSearch && matchNivel && matchGrade;
  });

  function openDelete(f: Formacao, e: React.MouseEvent) {
    e.stopPropagation();
    setToDelete(f);
    setDeleteOpen(true);
  }

  function handleDelete() {
    if (!toDelete) return;
    localStorage.removeItem(`doc_${toDelete.id}`);
    setFormacoes((prev) => prev.filter((f) => f.id !== toDelete.id));
    setDeleteOpen(false);
    setToDelete(null);
    toast.success("Formação excluída.");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Biblioteca de Formações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {formacoes.length} formações cadastradas · {formacoes.reduce((a, f) => a + f.cargaHoraria, 0)}h de conteúdo
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1.5" />
              Importar XLS
            </Button>
            <Button size="sm" onClick={() => router.push("/formacoes/novo")}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Formação
            </Button>
          </div>
        )}
        <ImportModal
          open={importOpen}
          onOpenChange={setImportOpen}
          title="Importar Formações"
          description="Importe formações a partir de uma planilha .xlsx, .xls ou .csv"
          systemFields={formacoesFields}
          onImport={importarFormacoes}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((nivel) => {
          const count = formacoes.filter((f) => f.nivelFormativo === nivel).length;
          return (
            <div
              key={nivel}
              onClick={() => setNivelFilter(nivelFilter === nivel ? "todos" : nivel)}
              className={`p-3 rounded-xl border shadow-sm cursor-pointer transition-all ${
                nivelFilter === nivel
                  ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                  : "bg-card border-border/60 hover:border-primary/30"
              }`}
            >
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                {NIVEL_FORMATIVO_LABELS[nivel]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por tema ou formador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={nivelFilter} onValueChange={(v) => v && setNivelFilter(v)}>
          <SelectTrigger className="h-9 w-full sm:w-52 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Etapa formativa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os níveis</SelectItem>
            <SelectItem value="pre-discipulado">Pré-Discipulado</SelectItem>
            <SelectItem value="discipulado">Discipulado</SelectItem>
            <SelectItem value="primeiras-promessas">Primeiras Promessas</SelectItem>
            <SelectItem value="formacao-permanente">Formação Permanente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={(v) => v && setGradeFilter(v)}>
          <SelectTrigger className="h-9 w-full sm:w-56 text-sm">
            <GitBranch className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Grade formativa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as grades</SelectItem>
            <SelectItem value="sem-grade">Sem grade vinculada</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">Nenhuma formação encontrada</p>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((formacao) => (
          <Card
            key={formacao.id}
            className="border-0 shadow-sm bg-card hover:shadow-md transition-all duration-200 group"
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-base">
                  {MODALIDADE_ICON[formacao.modalidade]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      className="text-sm font-semibold text-foreground leading-tight flex-1 min-w-0 text-left hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                      onClick={() => router.push(`/formacoes/${formacao.id}`)}
                    >
                      {formacao.tema}
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/formacoes/${formacao.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        {formacao.documentoAnexo && (
                          <DropdownMenuItem onClick={() => router.push(`/viewer?id=${formacao.id}&nome=${encodeURIComponent(formacao.documentoAnexo!)}&origem=/formacoes`)}>
                            <FileText className="h-4 w-4 mr-2" />
                            Ver documento
                          </DropdownMenuItem>
                        )}
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push(`/formacoes/${formacao.id}/editar`)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => openDelete(formacao, e)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {formacao.objetivo}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <Badge
                      variant="outline"
                      className={`text-xs ${NIVEL_CORES[formacao.nivelFormativo]}`}
                    >
                      {NIVEL_FORMATIVO_LABELS[formacao.nivelFormativo]}
                    </Badge>
                    {formacao.eixoNome && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-accent text-accent-foreground border-0"
                      >
                        {formacao.eixoNome}
                      </Badge>
                    )}
                    {formacao.gradeNome && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-violet-50 text-violet-700 border-violet-200 gap-1"
                      >
                        <GitBranch className="h-2.5 w-2.5" />
                        {formacao.gradeNome}
                      </Badge>
                    )}
                    {formacao.documentoAnexo && (
                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                        <Paperclip className="h-2.5 w-2.5 mr-1" />
                        PDF
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/60">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {formacao.formadorNome}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formacao.cargaHoraria}h
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {MODALIDADE_LABELS[formacao.modalidade]} · {formacao.vezesUtilizada}× utilizada
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir formação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{toDelete?.tema}</span>? Esta ação não
            pode ser desfeita.
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
