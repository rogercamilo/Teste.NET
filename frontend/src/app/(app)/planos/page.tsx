"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePlanos } from "@/lib/data-store";
import { extractDocumentFields } from "@/lib/doc-extract";
import {
  STATUS_PLANO_LABELS,
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  type StatusPlano,
  type PlanoFormativo,
  type NivelFormativo,
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
  Eye,
  FileText,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

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

type FormState = {
  nome: string;
  objetivos: string;
  fundamentacao: string;
  nivelFormativo: NivelFormativo;
  vigenciaInicio: string;
  vigenciaFim: string;
  status: StatusPlano;
  eixos: string;
  documentoNome: string;
  documentoUrl: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  objetivos: "",
  fundamentacao: "",
  nivelFormativo: "pre-discipulado",
  vigenciaInicio: "",
  vigenciaFim: "",
  status: "rascunho",
  eixos: "",
  documentoNome: "",
  documentoUrl: "",
};

const NIVEIS: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

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

export default function PlanosPage() {
  const router = useRouter();
  const [planos, setPlanos] = usePlanos();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<PlanoFormativo | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [planDocumentos, setPlanDocumentos] = useState<Record<string, string>>(
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
          // Fields already had content — offer to replace via a toast action
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

  function abrirViewer(plano: PlanoFormativo, e: React.MouseEvent) {
    e.stopPropagation();
    const nome = encodeURIComponent(plano.documentoAnexo ?? plano.nome);
    router.push(`/viewer?id=${plano.id}&nome=${nome}&origem=/planos`);
  }

  const filtered = planos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: PlanoFormativo, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(p);
    setForm({
      nome: p.nome,
      objetivos: p.objetivos,
      fundamentacao: p.fundamentacao,
      nivelFormativo: p.nivelFormativo,
      vigenciaInicio: p.vigenciaInicio,
      vigenciaFim: p.vigenciaFim,
      status: p.status,
      eixos: p.eixos.join("; "),
      documentoNome: p.documentoAnexo ?? "",
      documentoUrl: planDocumentos[p.id] ?? "",
    });
    setDialogOpen(true);
  }

  function openDelete(p: PlanoFormativo, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(p);
    setDeleteOpen(true);
  }

  function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (!form.vigenciaInicio || !form.vigenciaFim)
      return toast.error("Datas de vigência são obrigatórias.");

    const today = new Date().toISOString().split("T")[0];
    const payload = {
      nome: form.nome.trim(),
      objetivos: form.objetivos.trim(),
      fundamentacao: form.fundamentacao.trim(),
      nivelFormativo: form.nivelFormativo,
      vigenciaInicio: form.vigenciaInicio,
      vigenciaFim: form.vigenciaFim,
      status: form.status,
      eixos: form.eixos.split(";").map((e) => e.trim()).filter(Boolean),
      documentoAnexo: form.documentoNome || undefined,
    };

    if (editing) {
      setPlanos((prev) =>
        prev.map((p) =>
          p.id === editing.id ? { ...p, ...payload, atualizadoEm: today } : p
        )
      );
      if (form.documentoUrl) {
        sessionStorage.setItem(`doc_${editing.id}`, form.documentoUrl);
        setPlanDocumentos((prev) => ({ ...prev, [editing.id]: form.documentoUrl }));
      } else if (!form.documentoNome) {
        sessionStorage.removeItem(`doc_${editing.id}`);
        setPlanDocumentos((prev) => {
          const next = { ...prev };
          delete next[editing.id];
          return next;
        });
      }
      toast.success("Plano atualizado com sucesso!");
    } else {
      const newId = `p${Date.now()}`;
      setPlanos((prev) => [
        ...prev,
        { id: newId, ...payload, criadoEm: today, atualizadoEm: today },
      ]);
      if (form.documentoUrl) {
        sessionStorage.setItem(`doc_${newId}`, form.documentoUrl);
        setPlanDocumentos((prev) => ({ ...prev, [newId]: form.documentoUrl }));
      }
      toast.success("Plano criado com sucesso!");
    }
    setDialogOpen(false);
  }

  function handleDelete() {
    if (!editing) return;
    sessionStorage.removeItem(`doc_${editing.id}`);
    setPlanDocumentos((prev) => {
      const next = { ...prev };
      delete next[editing.id];
      return next;
    });
    setPlanos((prev) => prev.filter((p) => p.id !== editing.id));
    setDeleteOpen(false);
    setEditing(null);
    toast.success("Plano excluído.");
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Planos Formativos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Documentos macro da formação comunitária
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Plano
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["ativo", "em-revisao", "rascunho", "arquivado"] as StatusPlano[]).map((status) => {
          const count = planos.filter((p) => p.status === status).length;
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
        {filtered.map((plano) => {
          const temDocumento = !!planDocumentos[plano.id];
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
                          {temDocumento ? (
                            <button
                              onClick={(e) => abrirViewer(plano, e)}
                              className="text-sm font-semibold text-primary hover:underline underline-offset-2 text-left"
                            >
                              {plano.nome}
                            </button>
                          ) : (
                            <h3 className="text-sm font-semibold text-foreground">{plano.nome}</h3>
                          )}
                          <Badge variant="outline" className={`text-xs ${NIVEL_CORES[plano.nivelFormativo]}`}>
                            {NIVEL_FORMATIVO_LABELS[plano.nivelFormativo]}
                          </Badge>
                          <Badge variant="outline" className={`text-xs ${STATUS_STYLES[plano.status]}`}>
                            {STATUS_PLANO_LABELS[plano.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {plano.objetivos}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => openEdit(plano, e)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {temDocumento && (
                            <DropdownMenuItem onClick={(e) => abrirViewer(plano, e)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar documento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={(e) => openDelete(plano, e)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(plano.vigenciaInicio), "dd/MM/yyyy", { locale: ptBR })} —{" "}
                        {format(parseISO(plano.vigenciaFim), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>

                    {plano.eixos.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {plano.eixos.map((eixo) => (
                          <span key={eixo} className="px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs font-medium">
                            {eixo}
                          </span>
                        ))}
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

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Plano" : "Novo Plano Formativo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} placeholder="Plano Formativo 2025 — Discipulado" />
            </div>
            <div className="grid gap-1.5">
              <Label>Objetivos <span className="text-destructive">*</span></Label>
              <Textarea value={form.objetivos} onChange={(e) => set("objetivos")(e.target.value)} placeholder="Descreva os objetivos deste plano..." className="min-h-20 resize-none" />
            </div>
            <div className="grid gap-1.5">
              <Label>Fundamentação</Label>
              <Textarea value={form.fundamentacao} onChange={(e) => set("fundamentacao")(e.target.value)} placeholder="Base teológica e pedagógica..." className="min-h-16 resize-none" />
            </div>
            <div className="grid gap-1.5">
              <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
              <Select value={form.nivelFormativo} onValueChange={(v) => v && set("nivelFormativo")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NIVEIS.map((n) => (
                    <SelectItem key={n} value={n}>{NIVEL_FORMATIVO_LABELS[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const conflict = planos.find(
                  (p) => p.nivelFormativo === form.nivelFormativo && p.id !== editing?.id
                );
                return conflict ? (
                  <p className="text-xs text-amber-600">
                    Já existe um plano para esta etapa: <span className="font-medium">{conflict.nome}</span>
                  </p>
                ) : null;
              })()}
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
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => v && set("status")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_PLANO_LABELS) as StatusPlano[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_PLANO_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Eixos pedagógicos</Label>
              <Input value={form.eixos} onChange={(e) => set("eixos")(e.target.value)} placeholder="Identidade; Oração; Comunidade; Missão" />
              <p className="text-xs text-muted-foreground">Separe os eixos com ponto e vírgula (;)</p>
            </div>
            <div className="grid gap-1.5">
              <Label className="flex items-center gap-2">
                Documento do plano
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
            <Button onClick={handleSave}>{editing ? "Salvar alterações" : "Criar plano"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir plano</DialogTitle>
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
