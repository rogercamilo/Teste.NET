"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Star, Plus, Pencil, Trash2, MessageSquareQuote, CheckCircle2, FileEdit } from "lucide-react";
import { fmtDate } from "../_utils";
import type { DepoimentosData, DepoimentoRow, DepoimentoStatus } from "../_types";

interface Props {
  depoimentos: DepoimentosData | null;
  onReload: () => Promise<void> | void;
}

const STATUS_BADGE: Record<DepoimentoStatus, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400" },
  publicado: { label: "Publicado", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" },
  arquivado: { label: "Arquivado", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

const STATUS_LABEL: Record<DepoimentoStatus, string> = {
  rascunho: "Rascunho — não aparece no site",
  publicado: "Publicado — visível na landing e /precos",
  arquivado: "Arquivado — retirado de exibição",
};

interface FormState {
  nome: string;
  papel: string;
  comunidade: string;
  texto: string;
  nota: number;
  foto: string;
  status: DepoimentoStatus;
  destaque: boolean;
  ordem: string;
  consentimento: boolean;
}

const EMPTY_FORM: FormState = {
  nome: "", papel: "", comunidade: "", texto: "", nota: 5, foto: "",
  status: "rascunho", destaque: false, ordem: "0", consentimento: false,
};

function StarRow({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

export function TabDepoimentos({ depoimentos, onReload }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepoimentoRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DepoimentoRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(d: DepoimentoRow) {
    setEditing(d);
    setForm({
      nome: d.nome,
      papel: d.papel ?? "",
      comunidade: d.comunidade ?? "",
      texto: d.texto,
      nota: d.nota,
      foto: d.foto ?? "",
      status: d.status,
      destaque: d.destaque,
      ordem: String(d.ordem),
      consentimento: d.consentimento,
    });
    setDialogOpen(true);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (form.nome.trim().length < 2 || form.texto.trim().length < 10) {
      toast.error("Preencha o nome e um depoimento com ao menos 10 caracteres.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        papel: form.papel.trim() || undefined,
        comunidade: form.comunidade.trim() || undefined,
        texto: form.texto.trim(),
        nota: form.nota,
        foto: form.foto.trim() || undefined,
        status: form.status,
        destaque: form.destaque,
        ordem: Number(form.ordem) || 0,
        consentimento: form.consentimento,
      };
      const url = editing ? `/api/super-admin/depoimentos/${editing.id}` : "/api/super-admin/depoimentos";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao salvar depoimento.");
        return;
      }
      toast.success(editing ? "Depoimento atualizado." : "Depoimento criado.");
      setDialogOpen(false);
      await onReload();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(d: DepoimentoRow, status: DepoimentoStatus) {
    try {
      const res = await fetch(`/api/super-admin/depoimentos/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: d.nome,
          papel: d.papel ?? undefined,
          comunidade: d.comunidade ?? undefined,
          texto: d.texto,
          nota: d.nota,
          foto: d.foto ?? undefined,
          status,
          destaque: d.destaque,
          ordem: d.ordem,
          consentimento: d.consentimento,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao mudar status.");
        return;
      }
      toast.success(status === "publicado" ? "Depoimento publicado." : "Depoimento despublicado.");
      await onReload();
    } catch {
      toast.error("Erro de rede.");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/super-admin/depoimentos/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao excluir.");
        return;
      }
      toast.success("Depoimento excluído.");
      setDeleteTarget(null);
      await onReload();
    } catch {
      toast.error("Erro de rede.");
    } finally {
      setDeleting(false);
    }
  }

  if (!depoimentos) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando depoimentos...
      </div>
    );
  }

  const total = depoimentos.depoimentos.length;
  const publicados = depoimentos.counts.publicado ?? 0;
  const rascunhos = depoimentos.counts.rascunho ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MessageSquareQuote className="h-3.5 w-3.5" />Total
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{total}</div>
            <div className="text-xs text-muted-foreground mt-0.5">na base</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />Publicados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-emerald-600">{publicados}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {publicados >= 3 ? "estrela ativa no Google" : `faltam ${3 - publicados} p/ estrela`}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <FileEdit className="h-3.5 w-3.5" />Rascunhos
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-amber-600">{rascunhos}</div>
            <div className="text-xs text-muted-foreground mt-0.5">aguardando publicação</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Depoimentos de clientes reais. Publicados aparecem na landing e em /precos e alimentam a estrela (aggregateRating) do Google a partir de 3.
        </p>
        <Button size="sm" className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" />Novo depoimento
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {total === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum depoimento ainda. Clique em <strong>Novo depoimento</strong> para cadastrar o primeiro.
            </div>
          ) : (
            <div className="divide-y">
              {depoimentos.depoimentos.map((d) => {
                const badge = STATUS_BADGE[d.status];
                return (
                  <div key={d.id} className="p-4 flex gap-4 items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{d.nome}</span>
                        <StarRow value={d.nota} />
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {d.destaque && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            Destaque
                          </span>
                        )}
                      </div>
                      {(d.papel || d.comunidade) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[d.papel, d.comunidade].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <p className="text-sm text-foreground/80 mt-1.5 line-clamp-3">{d.texto}</p>
                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        {d.publicadoEm ? `Publicado ${fmtDate(d.publicadoEm)}` : `Criado ${fmtDate(d.criadoEm)}`}
                        {!d.consentimento && <span className="text-amber-600 ml-2">⚠ sem consentimento registrado</span>}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {d.status === "publicado" ? (
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void quickStatus(d, "rascunho")}>
                          Despublicar
                        </Button>
                      ) : (
                        <Button size="sm" className="gap-1.5" onClick={() => void quickStatus(d, "publicado")}>
                          <CheckCircle2 className="h-3.5 w-3.5" />Publicar
                        </Button>
                      )}
                      <div className="flex gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(d)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(d)} aria-label="Excluir">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar depoimento" : "Novo depoimento"}</DialogTitle>
            <DialogDescription>
              Cadastro manual de avaliação de cliente. Publique para exibir no site.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome *</label>
                <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Pe. João Silva" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Papel</label>
                <Input value={form.papel} onChange={(e) => set("papel", e.target.value)} placeholder="Coordenador de formação" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Comunidade / instituto</label>
              <Input value={form.comunidade} onChange={(e) => set("comunidade", e.target.value)} placeholder="Comunidade Nova Aliança" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Depoimento *</label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={4}
                value={form.texto}
                onChange={(e) => set("texto", e.target.value)}
                placeholder="Organizou nossa jornada formativa e deu clareza ao acompanhamento de cada membro..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nota</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("nota", n)}
                    aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
                    className="p-0.5"
                  >
                    <Star className={`h-6 w-6 transition-colors ${n <= form.nota ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30 hover:text-amber-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={(v) => v && set("status", v as DepoimentoStatus)}>
                  <SelectTrigger>
                    <SelectValue>{STATUS_BADGE[form.status].label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rascunho">{STATUS_LABEL.rascunho}</SelectItem>
                    <SelectItem value="publicado">{STATUS_LABEL.publicado}</SelectItem>
                    <SelectItem value="arquivado">{STATUS_LABEL.arquivado}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ordem</label>
                <Input type="number" min={0} value={form.ordem} onChange={(e) => set("ordem", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Foto do autor <span className="text-muted-foreground font-normal">(URL, opcional)</span></label>
              <Input value={form.foto} onChange={(e) => set("foto", e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.destaque} onChange={(e) => set("destaque", e.target.checked)} className="rounded" />
                Destaque (aparece em posição de relevo na landing)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.consentimento} onChange={(e) => set("consentimento", e.target.checked)} className="rounded" />
                Cliente autorizou exibir nome + comunidade publicamente (LGPD)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => void save()} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir depoimento</DialogTitle>
            <DialogDescription>
              Excluir permanentemente o depoimento de <strong>{deleteTarget?.nome}</strong>? Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleting} className="gap-1.5">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
