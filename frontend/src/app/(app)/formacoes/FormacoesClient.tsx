"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useEtapaLabels } from "@/lib/data-store";
import {
  NIVEL_CORES,
  MODALIDADE_LABELS,
  TIPO_FORMACAO_LABELS,
  TIPO_FORMACAO_CORES,
  isColunaCentral,
  podeElaborarConteudo,
  type Formacao,
  type GradeFormativa,
  type GrupoFormacao,
  type NivelFormativo,
  type Modalidade,
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Building2,
  Clock,
  Eye,
  FileText,
  Filter,
  GitBranch,
  Info,
  Layers,
  LayoutGrid,
  List,
  Monitor,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";

const MODALIDADE_ICON: Record<Modalidade, ComponentType<LucideProps>> = {
  presencial: Building2,
  online: Monitor,
  hibrida: Layers,
};

function ModalidadeIcon({ modalidade, ...props }: { modalidade: Modalidade } & LucideProps) {
  const Icon = MODALIDADE_ICON[modalidade];
  return <Icon aria-hidden {...props} />;
}

const NIVEIS_ORDEM: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

const PAGE_SIZE = 10;
const LIST_PAGE_SIZE = 20;

type ViewMode = "cartoes" | "lista";
type SortKey = "ordem" | "tema" | "nivel" | "tipo" | "grade" | "carga" | "realizacoes" | "modalidade" | "criadoEm";
type SortDir = "asc" | "desc";

const NIVEL_INDEX: Record<NivelFormativo, number> = NIVEIS_ORDEM.reduce(
  (acc, nivel, i) => ({ ...acc, [nivel]: i }),
  {} as Record<NivelFormativo, number>,
);

// Chave da "ordem de execução" definida na grade: nível → grade → nº na grade.
// Espelha a sequência que a grade formativa determina. Formações sem posição
// (pontuais / sem grade) caem ao fim de cada recorte (número alto + grade "￿").
function execOrderKey(f: Formacao): string {
  const nivel = String(NIVEL_INDEX[f.nivelFormativo] ?? 99).padStart(2, "0");
  const grade = (f.gradeNome ?? "￿").toLowerCase();
  const num = String(f.numero ?? 99999).padStart(5, "0");
  return `${nivel}|${grade}|${num}`;
}

interface FormacoesClientProps {
  initialFormacoes: Formacao[];
  initialGrades: GradeFormativa[];
  initialGruposFormacao: GrupoFormacao[];
  role: string;
  grupoFormacaoId: string | null;
}

export default function FormacoesClient({
  initialFormacoes,
  initialGrades,
  initialGruposFormacao,
  role,
  grupoFormacaoId,
}: FormacoesClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const etapaLabels = useEtapaLabels();
  const canEdit = podeElaborarConteudo(role);
  const isFormadorComunitario = role === "formador_comunitario";

  const myMorada = isFormadorComunitario ? initialGruposFormacao.find((m) => m.id === grupoFormacaoId) : undefined;
  const myNivel = myMorada?.nivelFormativo;

  const [search, setSearch] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [gradeFilter, setGradeFilter] = useState<string>("todas");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Formacao | null>(null);
  const [pagesByNivel, setPagesByNivel] = useState<Partial<Record<NivelFormativo, number>>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("cartoes");
  const [sortKey, setSortKey] = useState<SortKey>("ordem");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [listPage, setListPage] = useState(1);

  const baseFormacoes = isFormadorComunitario && myNivel
    ? initialFormacoes.filter((f) => f.nivelFormativo === myNivel)
    : initialFormacoes;

  const filtered = baseFormacoes.filter((f) => {
    const matchSearch =
      f.tema.toLowerCase().includes(search.toLowerCase());
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
      acc[nivel] = filtered
        .filter((f) => f.nivelFormativo === nivel)
        // Segue a ordem de execução da grade (grade → nº); pontuais ao fim.
        .sort((a, b) => execOrderKey(a).localeCompare(execOrderKey(b), "pt-BR"));
      return acc;
    }, {});

  const niveisComFormacoes = (Object.keys(grouped) as NivelFormativo[]).filter(
    (n) => (grouped[n]?.length ?? 0) > 0
  );

  // Lista tabular: mesmos filtros dos cartões (busca + grade), aplicando também
  // o filtro de nível, e ordenada pela coluna selecionada.
  const listBase = filtered.filter(
    (f) => nivelFilter === "todos" || f.nivelFormativo === nivelFilter
  );

  const sortComparators: Record<SortKey, (f: Formacao) => string | number> = {
    ordem: execOrderKey,
    tema: (f) => f.tema.toLowerCase(),
    nivel: (f) => NIVEL_INDEX[f.nivelFormativo] ?? 99,
    tipo: (f) => `${isColunaCentral(f.tipoFormacao) ? 0 : 1}-${TIPO_FORMACAO_LABELS[f.tipoFormacao]}`,
    grade: (f) => (f.gradeNome ?? "￿").toLowerCase(),
    carga: (f) => f.cargaHoraria,
    realizacoes: (f) => f.realizacoes ?? 0,
    modalidade: (f) => MODALIDADE_LABELS[f.modalidade],
    criadoEm: (f) => f.criadoEm,
  };

  const listItems = [...listBase].sort((a, b) => {
    const va = sortComparators[sortKey](a);
    const vb = sortComparators[sortKey](b);
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb), "pt-BR");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const pagedListItems = listItems.slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE);

  const noResults = viewMode === "lista" ? listItems.length === 0 : niveisComFormacoes.length === 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // padrões sensatos: ordem/texto asc; números/datas desc (mais recente/maior primeiro)
      setSortDir(key === "ordem" || key === "tema" || key === "grade" || key === "modalidade" || key === "nivel" ? "asc" : "desc");
    }
    setListPage(1);
  }

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

      {/* Nota: objetivo e ganho da biblioteca de formações para o formador */}
      <div className="flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Para que serve a biblioteca de formações?
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Aqui ficam todas as formações — as unidades concretas de conteúdo (tema,
            objetivo, carga e modalidade) que dão corpo às grades e são agendadas na
            agenda. Cada formação carrega seu material para o formador (uso interno) e
            para o formando (Portal), a posição no caminho formativo e o histórico de
            realizações. Para o formador, isso significa reaproveitar conteúdo já
            pronto, saber exatamente o que ministrar em cada encontro e ter o rastro do
            que já foi realizado — sem recriar formação a cada ciclo.
          </p>
        </div>
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
            placeholder="Buscar por tema..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        {!isFormadorComunitario && (
          <Select value={nivelFilter} onValueChange={(v) => v && setNivelFilter(v)} items={{ todos: "Todos os níveis", ...etapaLabels }}>
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
        <Select value={gradeFilter} onValueChange={(v) => v && setGradeFilter(v)} items={{ todas: "Todas as grades", "sem-grade": "Sem grade vinculada", ...Object.fromEntries(initialGrades.map((g) => [g.id, g.nome])) }}>
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
        <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card p-0.5 sm:ml-auto">
          <button
            type="button"
            onClick={() => setViewMode("cartoes")}
            aria-pressed={viewMode === "cartoes"}
            title="Ver em cartões"
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
              viewMode === "cartoes"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cartões</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("lista")}
            aria-pressed={viewMode === "lista"}
            title="Ver em lista"
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
              viewMode === "lista"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </button>
        </div>
      </div>

      {noResults && (
        baseFormacoes.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma formação cadastrada"
            description={
              canEdit
                ? "Cadastre a primeira formação — o conteúdo que compõe as grades e é agendado na agenda."
                : "Ainda não há formações cadastradas para o seu nível."
            }
            action={
              canEdit ? (
                <Button size="sm" onClick={() => router.push("/formacoes/novo")}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Cadastrar formação
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum resultado"
            description="Nenhuma formação corresponde à busca ou aos filtros atuais."
            secondaryAction={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setNivelFilter("todos");
                  setGradeFilter("todas");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        )
      )}

      {viewMode === "cartoes" && niveisComFormacoes.length > 0 && (
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

      {viewMode === "lista" && listItems.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortHeader label="Ordem" sortKey="ordem" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Formação" sortKey="tema" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                {!isFormadorComunitario && (
                  <SortHeader label="Etapa" sortKey="nivel" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                )}
                <SortHeader label="Tipo" sortKey="tipo" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Grade" sortKey="grade" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Carga" sortKey="carga" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortHeader label="Realizações" sortKey="realizacoes" activeKey={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                <SortHeader label="Modalidade" sortKey="modalidade" activeKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedListItems.map((formacao) => (
                <FormacaoRow
                  key={formacao.id}
                  formacao={formacao}
                  canEdit={canEdit}
                  showNivel={!isFormadorComunitario}
                  nivelLabel={etapaLabels[formacao.nivelFormativo]}
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
            </TableBody>
          </Table>
          <Pagination
            total={listItems.length}
            page={listPage}
            pageSize={LIST_PAGE_SIZE}
            onPageChange={setListPage}
            className="p-3 border-t border-border/60"
          />
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
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            <ModalidadeIcon modalidade={formacao.modalidade} className="size-4" />
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
              <Badge variant="outline" className={`text-xs ${TIPO_FORMACAO_CORES[formacao.tipoFormacao]}`}>
                {isColunaCentral(formacao.tipoFormacao) ? "Central" : "Auxiliar"} · {TIPO_FORMACAO_LABELS[formacao.tipoFormacao]}
              </Badge>
              {formacao.eixoNome && (
                <Badge variant="outline" className="text-xs bg-accent text-accent-foreground border-0">
                  {formacao.eixoNome}
                </Badge>
              )}
              {formacao.gradeNome ? (
                <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200 gap-1">
                  <GitBranch className="h-2.5 w-2.5" />
                  {formacao.numero != null && <span className="font-semibold">nº {formacao.numero} ·</span>}
                  {formacao.gradeNome}
                  {formacao.origem === "complementar" && <span className="ml-0.5">· extra</span>}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Pontual
                </Badge>
              )}
            </div>
            {(formacao.materialFormadorAnexo || formacao.documentoAnexo) && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {formacao.materialFormadorAnexo && (
                  <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-600 border-indigo-200" title="Material para o formador (uso interno)">
                    <Paperclip className="h-2.5 w-2.5 mr-1" />
                    Formador
                  </Badge>
                )}
                {formacao.documentoAnexo && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200" title="Material para o formando (também no Portal)">
                    <Paperclip className="h-2.5 w-2.5 mr-1" />
                    Formando
                  </Badge>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border/60">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formacao.cargaHoraria}h
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {MODALIDADE_LABELS[formacao.modalidade]} · {formacao.realizacoes ?? 0}× realizada
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}

function SortHeader({ label, sortKey, activeKey, dir, onSort, align = "left" }: SortHeaderProps) {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={align === "right" ? "text-right" : undefined}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 text-xs font-medium transition-colors hover:text-foreground ${
          align === "right" ? "flex-row-reverse" : ""
        } ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
        <Icon className={`h-3 w-3 ${active ? "text-primary" : "text-muted-foreground/60"}`} />
      </button>
    </TableHead>
  );
}

interface FormacaoRowProps {
  formacao: Formacao;
  canEdit: boolean;
  showNivel: boolean;
  nivelLabel: string;
  onView: () => void;
  onEdit: () => void;
  onViewDoc: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function FormacaoRow({ formacao, canEdit, showNivel, nivelLabel, onView, onEdit, onViewDoc, onDelete }: FormacaoRowProps) {
  return (
    <TableRow className="group cursor-pointer" onClick={onView}>
      <TableCell>
        {formacao.numero != null ? (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-violet-50 px-1.5 text-xs font-semibold text-violet-700 tabular-nums">
            {formacao.numero}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="max-w-xs">
        <div className="flex items-center gap-2.5">
          <ModalidadeIcon modalidade={formacao.modalidade} className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
              {formacao.tema}
            </p>
            {formacao.objetivo && (
              <p className="text-xs text-muted-foreground truncate">{formacao.objetivo}</p>
            )}
          </div>
          {formacao.materialFormadorAnexo && (
            <span className="shrink-0 inline-flex" title="Material para o formador (uso interno)" aria-label="Material para o formador">
              <Paperclip className="h-3 w-3 text-indigo-500" />
            </span>
          )}
          {formacao.documentoAnexo && (
            <span className="shrink-0 inline-flex" title="Material para o formando (também no Portal)" aria-label="Material para o formando">
              <Paperclip className="h-3 w-3 text-blue-500" />
            </span>
          )}
        </div>
      </TableCell>
      {showNivel && (
        <TableCell>
          <Badge variant="outline" className={`text-xs ${NIVEL_CORES[formacao.nivelFormativo]}`}>
            {nivelLabel}
          </Badge>
        </TableCell>
      )}
      <TableCell>
        <Badge variant="outline" className={`text-xs ${TIPO_FORMACAO_CORES[formacao.tipoFormacao]}`}>
          {isColunaCentral(formacao.tipoFormacao) ? "Central" : "Auxiliar"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formacao.gradeNome ? (
          <span className="inline-flex items-center gap-1">
            <GitBranch className="h-3 w-3" />
            {formacao.gradeNome}
            {formacao.origem === "complementar" && <span className="text-xs">· extra</span>}
          </span>
        ) : (
          <span className="text-amber-600">Pontual</span>
        )}
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
        {formacao.cargaHoraria}h
      </TableCell>
      <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
        {formacao.realizacoes ?? 0}×
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {MODALIDADE_LABELS[formacao.modalidade]}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
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
      </TableCell>
    </TableRow>
  );
}
