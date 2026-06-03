"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEtapaLabels } from "@/lib/data-store";
import {
  NIVEL_CORES,
  MODALIDADE_LABELS,
  type Formacao,
  type GradeFormativa,
  type Morada,
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
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";

const MODALIDADE_ICON: Record<Modalidade, string> = {
  presencial: "🏛️",
  online: "💻",
  hibrida: "🔄",
};

const NIVEIS_ORDEM: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

const PAGE_SIZE = 10;

interface FormacoesClientProps {
  initialFormacoes: Formacao[];
  initialGrades: GradeFormativa[];
  initialMoradas: Morada[];
  role: string;
  moradaId: string | null;
}

export default function FormacoesClient({
  initialFormacoes,
  initialGrades,
  initialMoradas,
  role,
  moradaId,
}: FormacoesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const etapaLabels = useEtapaLabels();
  const canEdit = role === "formador_geral" || role === "administrador";
  const isFormadorComunitario = role === "formador_comunitario";

  const myMorada = isFormadorComunitario ? initialMoradas.find((m) => m.id === moradaId) : undefined;
  const myNivel = myMorada?.nivelFormativo;

  const [search, setSearch] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [gradeFilter, setGradeFilter] = useState<string>("todas");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Formacao | null>(null);
  const [pagesByNivel, setPagesByNivel] = useState<Partial<Record<NivelFormativo, number>>>({});

  const baseFormacoes = isFormadorComunitario && myNivel
    ? initialFormacoes.filter((f) => f.nivelFormativo === myNivel)
    : initialFormacoes;

  const filtered = baseFormacoes.filter((f) => {
    const matchSearch =
      f.tema.toLowerCase().includes(search.toLowerCase()) ||
      f.formadorNome.toLowerCase().includes(search.toLowerCase());
    const matchGrade =
      gradeFilter === "todas" ? true
      : gradeFilter === "sem-grade" ? !f.gradeId
      : f.gradeId === gradeFilter;
    return matchSearch && matchGrade;
  });

  const niveisVisiveis: NivelFormativo[] = isFormadorComunitario && myNivel
    ? [myNivel]
    : NIVEIS_ORDEM;

  const grouped = niveisVisiveis
    .filter((nivel) => nivelFilter === "todos" || nivel === nivelFilter)
    .reduce<Partial<Record<NivelFormativo, Formacao[]>>>((acc, nivel) => {
      acc[nivel] = filtered.filter((f) => f.nivelFormativo === nivel);
      return acc;
    }, {});

  const niveisComFormacoes = (Object.keys(grouped) as NivelFormativo[]).filter(
    (n) => (grouped[n]?.length ?? 0) > 0
  );

  function openDelete(f: Formacao, e: React.MouseEvent) {
    e.stopPropagation();
    setToDelete(f);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      const res = await fetch(`/api/formacoes/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) return toast.error("Erro ao excluir formação.");
      toast.success("Formação excluída.");
      setDeleteOpen(false);
      setToDelete(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Biblioteca de Formações</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {baseFormacoes.length} formações cadastradas · {baseFormacoes.reduce((a, f) => a + f.cargaHoraria, 0)}h de conteúdo
            {isFormadorComunitario && myMorada && (
              <span className="ml-1.5">· {myMorada.nome}</span>
            )}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => router.push("/formacoes/novo")}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Formação
          </Button>
        )}
      </div>

      {!isFormadorComunitario && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {NIVEIS_ORDEM.map((nivel) => {
            const count = initialFormacoes.filter((f) => f.nivelFormativo === nivel).length;
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
                  {etapaLabels[nivel]}
                </p>
              </div>
            );
          })}
        </div>
      )}

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
        {!isFormadorComunitario && (
          <Select value={nivelFilter} onValueChange={(v) => v && setNivelFilter(v)}>
            <SelectTrigger className="h-9 w-full sm:w-52 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Etapa formativa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os níveis</SelectItem>
              {(Object.entries(etapaLabels) as [NivelFormativo, string][]).map(([nivel, label]) => (
                <SelectItem key={nivel} value={nivel}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={gradeFilter} onValueChange={(v) => v && setGradeFilter(v)}>
          <SelectTrigger className="h-9 w-full sm:w-56 text-sm">
            <GitBranch className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Grade formativa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as grades</SelectItem>
            <SelectItem value="sem-grade">Sem grade vinculada</SelectItem>
            {initialGrades.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {niveisComFormacoes.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">Nenhuma formação encontrada</p>
        </div>
      )}

      {niveisComFormacoes.length > 0 && (
        <div className="space-y-8">
          {niveisVisiveis
            .filter((nivel) => nivelFilter === "todos" || nivel === nivelFilter)
            .map((nivel) => {
              const items = grouped[nivel] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={nivel}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-base font-semibold text-foreground">{etapaLabels[nivel]}</h2>
                    <Badge variant="outline" className={`text-xs ${NIVEL_CORES[nivel]}`}>
                      {items.length} formação{items.length !== 1 ? "ões" : ""}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {items.slice(((pagesByNivel[nivel] ?? 1) - 1) * PAGE_SIZE, (pagesByNivel[nivel] ?? 1) * PAGE_SIZE).map((formacao) => (
                      <FormacaoCard
                        key={formacao.id}
                        formacao={formacao}
                        canEdit={canEdit}
                        onView={() => router.push(`/formacoes/${formacao.id}`)}
                        onEdit={() => router.push(`/formacoes/${formacao.id}/editar`)}
                        onViewDoc={() =>
                          router.push(
                            `/viewer?arquivoId=${formacao.documentoAnexoId}&nome=${encodeURIComponent(formacao.documentoAnexo!)}&origem=/formacoes`
                          )
                        }
                        onDelete={(e) => openDelete(formacao, e)}
                      />
                    ))}
                  </div>
                  <Pagination
                    total={items.length}
                    page={pagesByNivel[nivel] ?? 1}
                    pageSize={PAGE_SIZE}
                    onPageChange={(p) => setPagesByNivel((prev) => ({ ...prev, [nivel]: p }))}
                    className="mt-4"
                  />
                </section>
              );
            })}
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir formação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{toDelete?.tema}</span>? Esta ação não pode ser desfeita.
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

interface FormacaoCardProps {
  formacao: Formacao;
  canEdit: boolean;
  onView: () => void;
  onEdit: () => void;
  onViewDoc: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function FormacaoCard({ formacao, canEdit, onView, onEdit, onViewDoc, onDelete }: FormacaoCardProps) {
  return (
    <Card className="border-0 shadow-sm bg-card hover:shadow-md transition-all duration-200 group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-base">
            {MODALIDADE_ICON[formacao.modalidade]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <button
                className="text-sm font-semibold text-foreground leading-tight flex-1 min-w-0 text-left hover:text-primary transition-colors focus-visible:outline-none focus-visible:underline"
                onClick={onView}
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
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </DropdownMenuItem>
                  {formacao.documentoAnexo && formacao.documentoAnexoId && (
                    <DropdownMenuItem onClick={onViewDoc}>
                      <FileText className="h-4 w-4 mr-2" />
                      Ver documento
                    </DropdownMenuItem>
                  )}
                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onEdit}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={onDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{formacao.objetivo}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {formacao.eixoNome && (
                <Badge variant="outline" className="text-xs bg-accent text-accent-foreground border-0">
                  {formacao.eixoNome}
                </Badge>
              )}
              {formacao.gradeNome && (
                <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200 gap-1">
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
  );
}
