"use client";

import { useState } from "react";
import { mockFormacoes, mockUsuarios } from "@/lib/mock-data";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Filter,
  MoreHorizontal,
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

type FormState = {
  tema: string;
  objetivo: string;
  descricao: string;
  nivelFormativo: NivelFormativo;
  formadorId: string;
  cargaHoraria: string;
  modalidade: Modalidade;
  eixoNome: string;
  materialApoio: string;
};

const EMPTY_FORM: FormState = {
  tema: "",
  objetivo: "",
  descricao: "",
  nivelFormativo: "pre-discipulado",
  formadorId: "",
  cargaHoraria: "2",
  modalidade: "presencial",
  eixoNome: "",
  materialApoio: "",
};

const formadores = mockUsuarios.filter((u) => u.ativo);

export default function FormacoesPage() {
  const [formacoes, setFormacoes] = useState<Formacao[]>(mockFormacoes);
  const [search, setSearch] = useState("");
  const [nivelFilter, setNivelFilter] = useState<string>("todos");
  const [importOpen, setImportOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Formacao | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const filtered = formacoes.filter((f) => {
    const matchSearch =
      f.tema.toLowerCase().includes(search.toLowerCase()) ||
      f.formadorNome.toLowerCase().includes(search.toLowerCase());
    const matchNivel = nivelFilter === "todos" || f.nivelFormativo === nivelFilter;
    return matchSearch && matchNivel;
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(f: Formacao, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(f);
    setForm({
      tema: f.tema,
      objetivo: f.objetivo,
      descricao: f.descricao,
      nivelFormativo: f.nivelFormativo,
      formadorId: f.formadorId,
      cargaHoraria: String(f.cargaHoraria),
      modalidade: f.modalidade,
      eixoNome: f.eixoNome ?? "",
      materialApoio: f.materialApoio ?? "",
    });
    setDialogOpen(true);
  }

  function openDelete(f: Formacao, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(f);
    setDeleteOpen(true);
  }

  function handleSave() {
    if (!form.tema.trim()) return toast.error("Tema é obrigatório.");
    if (!form.formadorId) return toast.error("Selecione um formador.");
    const horas = Number(form.cargaHoraria);
    if (!horas || horas <= 0) return toast.error("Carga horária inválida.");

    const formador = formadores.find((u) => u.id === form.formadorId);
    const today = new Date().toISOString().split("T")[0];

    const payload: Formacao = {
      id: editing?.id ?? `fm${Date.now()}`,
      tema: form.tema.trim(),
      objetivo: form.objetivo.trim(),
      descricao: form.descricao.trim(),
      nivelFormativo: form.nivelFormativo,
      formadorId: form.formadorId,
      formadorNome: formador?.nome ?? "",
      cargaHoraria: horas,
      modalidade: form.modalidade,
      eixoNome: form.eixoNome.trim() || undefined,
      materialApoio: form.materialApoio.trim() || undefined,
      vezesUtilizada: editing?.vezesUtilizada ?? 0,
      criadoEm: editing?.criadoEm ?? today,
    };

    if (editing) {
      setFormacoes((prev) => prev.map((f) => (f.id === editing.id ? payload : f)));
      toast.success("Formação atualizada com sucesso!");
    } else {
      setFormacoes((prev) => [...prev, payload]);
      toast.success("Formação criada com sucesso!");
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (!editing) return;
    setFormacoes((prev) => prev.filter((f) => f.id !== editing.id));
    setDeleteOpen(false);
    setEditing(null);
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Importar XLS
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Formação
          </Button>
        </div>
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
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">Nenhuma formação encontrada</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((formacao) => (
          <Card key={formacao.id} className="border-0 shadow-sm bg-card hover:shadow-md transition-all duration-200 group">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-base">
                  {MODALIDADE_ICON[formacao.modalidade]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground leading-tight flex-1 min-w-0">
                      {formacao.tema}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => openEdit(formacao, e)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={(e) => openDelete(formacao, e)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{formacao.objetivo}</p>

                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <Badge variant="outline" className={`text-xs ${NIVEL_CORES[formacao.nivelFormativo]}`}>
                      {NIVEL_FORMATIVO_LABELS[formacao.nivelFormativo]}
                    </Badge>
                    {formacao.eixoNome && (
                      <Badge variant="outline" className="text-xs bg-accent text-accent-foreground border-0">
                        {formacao.eixoNome}
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

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Formação" : "Nova Formação"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Tema <span className="text-destructive">*</span></Label>
              <Input value={form.tema} onChange={(e) => set("tema")(e.target.value)} placeholder="Quem Sou Eu? — Identidade em Cristo" />
            </div>
            <div className="grid gap-1.5">
              <Label>Objetivo <span className="text-destructive">*</span></Label>
              <Textarea value={form.objetivo} onChange={(e) => set("objetivo")(e.target.value)} placeholder="Descreva o objetivo desta formação..." className="min-h-16 resize-none" />
            </div>
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => set("descricao")(e.target.value)} placeholder="Detalhes adicionais sobre o conteúdo..." className="min-h-16 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
                <Select value={form.nivelFormativo} onValueChange={(v) => v && set("nivelFormativo")(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((n) => (
                      <SelectItem key={n} value={n}>{NIVEL_FORMATIVO_LABELS[n]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Modalidade</Label>
                <Select value={form.modalidade} onValueChange={(v) => v && set("modalidade")(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hibrida">Híbrida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Formador <span className="text-destructive">*</span></Label>
                <Select value={form.formadorId} onValueChange={(v) => v && set("formadorId")(v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {formadores.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Carga horária (h) <span className="text-destructive">*</span></Label>
                <Input type="number" min="1" value={form.cargaHoraria} onChange={(e) => set("cargaHoraria")(e.target.value)} placeholder="2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Eixo</Label>
                <Input value={form.eixoNome} onChange={(e) => set("eixoNome")(e.target.value)} placeholder="Ex.: Identidade" />
              </div>
              <div className="grid gap-1.5">
                <Label>Material de apoio</Label>
                <Input value={form.materialApoio} onChange={(e) => set("materialApoio")(e.target.value)} placeholder="Link ou referência" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Criar formação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir formação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <span className="font-medium text-foreground">{editing?.tema}</span>? Esta ação não pode ser desfeita.
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
