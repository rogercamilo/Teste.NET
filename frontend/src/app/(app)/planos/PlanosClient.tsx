"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  STATUS_PLANO_LABELS,
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  type StatusPlano,
  type PlanoFormativo,
  type NivelFormativo,
  type GrupoFormacao,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  Calendar,
  Eye,
  FileText,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/pagination";

const STATUS_STYLES: Record<StatusPlano, string> = {
  rascunho: "bg-slate-100 text-slate-600 border-slate-200",
  "em-revisao": "bg-amber-100 text-amber-700 border-amber-200",
  ativo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  arquivado: "bg-slate-100 text-slate-400 border-slate-200",
};

const STATUS_DOT: Record<StatusPlano, string> = {
  rascunho: "bg-slate-400",
  "em-revisao": "bg-amber-500",
  ativo: "bg-emerald-500",
  arquivado: "bg-slate-300",
};

interface PlanosClientProps {
  role: string;
  grupoFormacaoId: string | null;
  initialPlanos: PlanoFormativo[];
  initialGruposFormacao: GrupoFormacao[];
}

const PAGE_SIZE = 10;

export default function PlanosClient({ role, grupoFormacaoId, initialPlanos, initialGruposFormacao }: PlanosClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PlanoFormativo | null>(null);
  const [page, setPage] = useState(1);

  const isAdmin = role === "formador_geral" || role === "administrador";

  const meuGrupoFormacao =
    role === "formador_comunitario" && grupoFormacaoId
      ? initialGruposFormacao.find((m) => m.id === grupoFormacaoId)
      : null;
  const nivelRestrito: NivelFormativo | null = meuGrupoFormacao?.nivelFormativo ?? null;

  const visiblePlanos = nivelRestrito
    ? initialPlanos.filter((p) => p.nivelFormativo === nivelRestrito)
    : initialPlanos;

  const filtered = visiblePlanos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  function openDelete(p: PlanoFormativo, e: React.MouseEvent) {
    e.stopPropagation();
    setToDelete(p);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      const res = await fetch(`/api/planos/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) return toast.error("Erro ao excluir plano.");
      toast.success("Plano excluído.");
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
          <h1 className="text-2xl font-semibold text-foreground">Planos Formativos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {nivelRestrito
              ? `Planos do nível: ${NIVEL_FORMATIVO_LABELS[nivelRestrito]}`
              : "Documentos macro da formação comunitária"}
          </p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => router.push("/planos/novo")}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Plano
          </Button>
        )}
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["ativo", "em-revisao", "rascunho", "arquivado"] as StatusPlano[]).map((status) => {
          const count = visiblePlanos.filter((p) => p.status === status).length;
          return (
            <div key={status} className="flex items-center gap-2.5 p-3 rounded-xl bg-card border border-border/60 shadow-sm">
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{STATUS_PLANO_LABELS[status]}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar plano..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">Nenhum plano encontrado</p>
          </div>
        )}
        {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((plano) => {
          const totalCH = plano.eixos.reduce((acc, e) => acc + e.cargaHoraria, 0);
          const nRetirosC = (plano.retiros ?? []).filter((r) => r.tipo === "comunitario").length;
          const nRetirosP = (plano.retiros ?? []).filter((r) => r.tipo === "pessoal").length;
          return (
            <Card key={plano.id} className="border-0 shadow-sm bg-card hover:shadow-md transition-all duration-200 group">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => router.push(`/planos/${plano.id}`)}
                            className="text-sm font-semibold text-primary hover:underline underline-offset-2 text-left"
                          >
                            {plano.nome}
                          </button>
                          <Badge variant="outline" className={`text-xs ${NIVEL_CORES[plano.nivelFormativo]}`}>
                            {NIVEL_FORMATIVO_LABELS[plano.nivelFormativo]}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${STATUS_STYLES[plano.status]}`}>
                            {STATUS_PLANO_LABELS[plano.status]}
                          </Badge>
                        </div>
                        {plano.objetivos && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {plano.objetivos}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/planos/${plano.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {plano.documentoAnexo && plano.documentoAnexoId && (
                            <DropdownMenuItem onClick={() => router.push(`/viewer?arquivoId=${plano.documentoAnexoId}&nome=${encodeURIComponent(plano.documentoAnexo!)}&origem=/planos/${plano.id}`)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Ver documento
                            </DropdownMenuItem>
                          )}
                          {isAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => router.push(`/planos/${plano.id}/editar`)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={(e) => openDelete(plano, e)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span className="text-muted-foreground/60">Cadastrado em:</span>
                        {format(parseISO(plano.criadoEm.split("T")[0]), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {totalCH > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3 shrink-0" />
                          {totalCH}h · {plano.eixos.length} {plano.eixos.length === 1 ? "eixo" : "eixos"}
                        </div>
                      )}
                    </div>

                    {plano.eixos.length > 0 && (
                      <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1.5">Eixos Formativos</p>
                      <div className="flex flex-wrap gap-1.5">
                        {plano.eixos.map((eixo) => (
                          <div key={eixo.id} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs font-medium">
                            <span>{eixo.nomeEtapa || eixo.nome}</span>
                            {eixo.areaFormacao && (
                              <span className="text-muted-foreground opacity-70">
                                · <span className="opacity-70">Área formativa:</span> {eixo.areaFormacao}
                              </span>
                            )}
                          </div>
                        ))}
                        {nRetirosC > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-medium">
                            {nRetirosC} Retiro{nRetirosC !== 1 ? "s" : ""} comunitário{nRetirosC !== 1 ? "s" : ""}
                          </div>
                        )}
                        {nRetirosP > 0 && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-medium">
                            {nRetirosP} Retiro{nRetirosP !== 1 ? "s" : ""} pessoa{nRetirosP !== 1 ? "is" : ""}
                          </div>
                        )}
                      </div>
                      </div>
                    )}

                    {plano.documentoAnexo && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate max-w-xs">{plano.documentoAnexo}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      {isAdmin && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir plano</DialogTitle>
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
      )}
    </div>
  );
}
