"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGrades, db } from "@/lib/data-store";
import { extractDocumentFields } from "@/lib/doc-extract";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  type NivelFormativo,
  type GradeFormativa,
  type Eixo,
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
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Eye,
  GitBranch,
  Layers,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
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

const EIXO_HEX = ["#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

type FormState = {
  nome: string;
  planoId: string;
  nivelFormativo: NivelFormativo;
  vigenciaInicio: string;
  vigenciaFim: string;
  versao: string;
  eixos: string;
  objetivos: string;
  fundamentacao: string;
  documentoNome: string;
  documentoUrl: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  planoId: "",
  nivelFormativo: "pre-discipulado",
  vigenciaInicio: "",
  vigenciaFim: "",
  versao: "1.0",
  eixos: "",
  objetivos: "",
  fundamentacao: "",
  documentoNome: "",
  documentoUrl: "",
};

function parseEixos(raw: string, gradeId: string): Eixo[] {
  return raw
    .split(";")
    .map((n) => n.trim())
    .filter(Boolean)
    .map((nome, i) => ({
      id: `e${Date.now()}-${i}`,
      nome,
      descricao: "",
      gradeId,
      ordem: i + 1,
      cor: EIXO_HEX[i % EIXO_HEX.length],
    }));
}

function loadDocumentosFromStorage(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const result: Record<string, string> = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith("doc_")) {
      const val = sessionStorage.getItem(key);
      if (val) result[key.slice(4)] = val;
    }
  }
  return result;
}

export default function GradesPage() {
  const router = useRouter();
  const [grades, setGrades] = useGrades();
  const [allPlanos] = useState(() => db.planos.load());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<GradeFormativa | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [gradeDocumentos, setGradeDocumentos] = useState<Record<string, string>>(
    loadDocumentosFromStorage
  );
  const [extracting, setExtracting] = useState(false);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleDocumentoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const { objetivos, fundamentacao, dataUrl } = await extractDocumentFields(file);
      setForm((prev) => {
        const next = { ...prev, documentoNome: file.name, documentoUrl: dataUrl };
        const willFillObjetivos = !!objetivos && !prev.objetivos.trim();
        const willFillFundamentacao = !!fundamentacao && !prev.fundamentacao.trim();
        if (willFillObjetivos) next.objetivos = objetivos;
        if (willFillFundamentacao) next.fundamentacao = fundamentacao;

        const filled = [willFillObjetivos && "Objetivos", willFillFundamentacao && "Fundamentação"]
          .filter(Boolean).join(" e ");

        if (filled) {
          toast.success(`Campos preenchidos a partir do documento: ${filled}`);
        } else if (objetivos || fundamentacao) {
          const pending = { objetivos, fundamentacao };
          toast("Conteúdo encontrado no documento", {
            description: "Os campos já estão preenchidos. Deseja substituir?",
            action: {
              label: "Substituir",
              onClick: () =>
                setForm((p) => ({
                  ...p,
                  objetivos: pending.objetivos || p.objetivos,
                  fundamentacao: pending.fundamentacao || p.fundamentacao,
                })),
            },
          });
        } else {
          toast.info("Documento anexado. Conteúdo não identificado automaticamente.");
        }
        return next;
      });
    } finally {
      setExtracting(false);
    }
  }

  function removerDocumentoForm() {
    setForm((prev) => ({ ...prev, documentoNome: "", documentoUrl: "" }));
  }

  function abrirViewer(grade: GradeFormativa, e: React.MouseEvent) {
    e.stopPropagation();
    const nome = encodeURIComponent(grade.documentoAnexo ?? grade.nome);
    router.push(`/viewer?id=${grade.id}&nome=${nome}&origem=/grades`);
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(g: GradeFormativa, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(g);
    setForm({
      nome: g.nome,
      planoId: g.planoId,
      nivelFormativo: g.nivelFormativo,
      vigenciaInicio: g.vigenciaInicio,
      vigenciaFim: g.vigenciaFim,
      versao: g.versao,
      eixos: g.eixos.map((e) => e.nome).join("; "),
      objetivos: g.objetivos ?? "",
      fundamentacao: g.fundamentacao ?? "",
      documentoNome: g.documentoAnexo ?? "",
      documentoUrl: gradeDocumentos[g.id] ?? "",
    });
    setDialogOpen(true);
  }

  function openDelete(g: GradeFormativa, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(g);
    setDeleteOpen(true);
  }

  function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (!form.vigenciaInicio || !form.vigenciaFim)
      return toast.error("Datas de vigência são obrigatórias.");

    const plano = allPlanos.find((p) => p.id === form.planoId);
    const id = editing?.id ?? `g${Date.now()}`;
    const today = new Date().toISOString().split("T")[0];
    // nivelFormativo is derived from the linked plano (1:1 chain)
    const nivelFormativo = plano?.nivelFormativo ?? form.nivelFormativo;

    const payload: GradeFormativa = {
      id,
      nome: form.nome.trim(),
      planoId: form.planoId,
      planoNome: plano?.nome ?? "",
      nivelFormativo,
      vigenciaInicio: form.vigenciaInicio,
      vigenciaFim: form.vigenciaFim,
      versao: form.versao || "1.0",
      eixos: parseEixos(form.eixos, id),
      etapas: editing?.etapas ?? [],
      totalFormacoes: editing?.totalFormacoes ?? 0,
      objetivos: form.objetivos.trim() || undefined,
      fundamentacao: form.fundamentacao.trim() || undefined,
      documentoAnexo: form.documentoNome || undefined,
      ativo: true,
      criadoEm: editing?.criadoEm ?? today,
    };

    if (editing) {
      setGrades((prev) => prev.map((g) => (g.id === editing.id ? payload : g)));
      if (form.documentoUrl) {
        sessionStorage.setItem(`doc_${id}`, form.documentoUrl);
        setGradeDocumentos((prev) => ({ ...prev, [id]: form.documentoUrl }));
      } else if (!form.documentoNome) {
        sessionStorage.removeItem(`doc_${id}`);
        setGradeDocumentos((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      toast.success("Grade atualizada com sucesso!");
    } else {
      setGrades((prev) => [...prev, payload]);
      if (form.documentoUrl) {
        sessionStorage.setItem(`doc_${id}`, form.documentoUrl);
        setGradeDocumentos((prev) => ({ ...prev, [id]: form.documentoUrl }));
      }
      toast.success("Grade criada com sucesso!");
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (!editing) return;
    sessionStorage.removeItem(`doc_${editing.id}`);
    setGradeDocumentos((prev) => {
      const next = { ...prev };
      delete next[editing.id];
      return next;
    });
    setGrades((prev) => prev.filter((g) => g.id !== editing.id));
    setDeleteOpen(false);
    setEditing(null);
    toast.success("Grade excluída.");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Grades Formativas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detalhamento operacional dos planos formativos
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Grade
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-sm text-center">
          <p className="text-xl font-bold text-foreground">{grades.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Grades ativas</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-sm text-center">
          <p className="text-xl font-bold text-foreground">
            {grades.reduce((acc, g) => acc + g.eixos.length, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Eixos</p>
        </div>
        <div className="p-3 rounded-xl bg-card border border-border/60 shadow-sm text-center">
          <p className="text-xl font-bold text-foreground">
            {grades.reduce((acc, g) => acc + g.totalFormacoes, 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Formações</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {grades.map((grade) => {
          const temDocumento = !!gradeDocumentos[grade.id];
          return (
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
                          {temDocumento ? (
                            <button
                              onClick={(e) => abrirViewer(grade, e)}
                              className="text-sm font-semibold text-primary hover:underline underline-offset-2 text-left"
                            >
                              {grade.nome}
                            </button>
                          ) : (
                            <h3 className="text-sm font-semibold text-foreground">{grade.nome}</h3>
                          )}
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
                          <DropdownMenuItem onClick={(e) => openEdit(grade, e)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {temDocumento && (
                            <DropdownMenuItem onClick={(e) => abrirViewer(grade, e)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar documento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={(e) => openDelete(grade, e)}>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
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
          );
        })}
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Grade" : "Nova Grade Formativa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} placeholder="Grade Pré-Discipulado 2025" />
            </div>
            <div className="grid gap-1.5">
              <Label>Plano Formativo</Label>
              <Select
                value={form.planoId}
                onValueChange={(v) => {
                  if (!v) return;
                  const plano = allPlanos.find((p) => p.id === v);
                  setForm((prev) => ({
                    ...prev,
                    planoId: v,
                    nivelFormativo: plano?.nivelFormativo ?? prev.nivelFormativo,
                  }));
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                <SelectContent>
                  {allPlanos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span>{p.nome}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({NIVEL_FORMATIVO_LABELS[p.nivelFormativo]})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
              <Select
                value={form.nivelFormativo}
                onValueChange={(v) => v && set("nivelFormativo")(v)}
                disabled={!!form.planoId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((n) => (
                    <SelectItem key={n} value={n}>{NIVEL_FORMATIVO_LABELS[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.planoId && (
                <p className="text-xs text-muted-foreground">Definida automaticamente pelo plano selecionado.</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Vigência início <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.vigenciaInicio} onChange={(e) => set("vigenciaInicio")(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Vigência fim <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.vigenciaFim} onChange={(e) => set("vigenciaFim")(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Versão</Label>
              <Input value={form.versao} onChange={(e) => set("versao")(e.target.value)} placeholder="1.0" />
            </div>
            <div className="grid gap-1.5">
              <Label>Objetivos</Label>
              <Textarea value={form.objetivos} onChange={(e) => set("objetivos")(e.target.value)} placeholder="Descreva os objetivos desta grade formativa..." className="min-h-20 resize-none" />
            </div>
            <div className="grid gap-1.5">
              <Label>Fundamentação</Label>
              <Textarea value={form.fundamentacao} onChange={(e) => set("fundamentacao")(e.target.value)} placeholder="Base teológica e pedagógica..." className="min-h-16 resize-none" />
            </div>
            <div className="grid gap-1.5">
              <Label>Eixos Pedagógicos</Label>
              <Input value={form.eixos} onChange={(e) => set("eixos")(e.target.value)} placeholder="Identidade; Oração; Comunidade; Missão" />
              <p className="text-xs text-muted-foreground">Separe os eixos com ponto e vírgula (;)</p>
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-2">
                Documento da grade
                {extracting && (
                  <span className="text-xs text-primary animate-pulse">Lendo documento…</span>
                )}
              </Label>
              {form.documentoNome ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{form.documentoNome}</span>
                  <button
                    type="button"
                    onClick={removerDocumentoForm}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className={`flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-muted/20 transition-colors ${extracting ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/40"}`}>
                  <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">Selecionar PDF ou Word (.pdf, .docx, .doc)</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    className="hidden"
                    disabled={extracting}
                    onChange={handleDocumentoInput}
                  />
                </label>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Criar grade"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir grade</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <span className="font-medium text-foreground">{editing?.nome}</span>? Esta ação não pode ser desfeita.
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
