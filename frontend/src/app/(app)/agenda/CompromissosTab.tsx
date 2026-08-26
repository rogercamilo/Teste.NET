"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  TIPO_COMPROMISSO_LABELS,
  TIPO_COMPROMISSO_CORES,
  TIPOS_COMPROMISSO,
  type Compromisso,
  type TipoCompromisso,
} from "@/types";
import { useTermos } from "@/lib/data-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { CalendarClock, Info, MapPin, Video, Pencil, Trash2, Plus, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AdicionarAoCalendario } from "@/components/AdicionarAoCalendario";

const JSON_HEADERS = { "Content-Type": "application/json" };

type FormState = {
  titulo: string;
  tipo: TipoCompromisso;
  dataInicio: string;
  dataFim: string;
  local: string;
  linkOnline: string;
  descricao: string;
  formandoId: string;
};

const EMPTY: FormState = {
  titulo: "", tipo: "reuniao", dataInicio: "", dataFim: "",
  local: "", linkOnline: "", descricao: "", formandoId: "",
};

const SEM_VINCULO = "__nenhum__";

/** ISO → valor de <input datetime-local> ("YYYY-MM-DDTHH:mm" no fuso local). */
function isoToLocalInput(iso: string): string {
  try { return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm"); } catch { return ""; }
}

export function CompromissosTab({
  initialCompromissos,
  formandosVinculo,
}: {
  initialCompromissos: Compromisso[];
  formandosVinculo: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const { formando: termoFormando } = useTermos();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Compromisso | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const compromissos = [...initialCompromissos].sort(
    (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
  );

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function openNovo() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(c: Compromisso) {
    setEditing(c);
    setForm({
      titulo: c.titulo,
      tipo: c.tipo,
      dataInicio: isoToLocalInput(c.dataInicio),
      dataFim: c.dataFim ? isoToLocalInput(c.dataFim) : "",
      local: c.local ?? "",
      linkOnline: c.linkOnline ?? "",
      descricao: c.descricao ?? "",
      formandoId: c.formandoId ?? "",
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.titulo.trim()) return toast.error("Informe um título.");
    if (!form.dataInicio) return toast.error("Informe a data e hora de início.");
    setSaving(true);
    try {
      const dataInicioISO = new Date(form.dataInicio).toISOString();
      const dataFimISO = form.dataFim ? new Date(form.dataFim).toISOString() : dataInicioISO;
      const payload = {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        dataInicio: dataInicioISO,
        dataFim: dataFimISO,
        local: form.local.trim() || null,
        linkOnline: form.linkOnline.trim() || null,
        descricao: form.descricao.trim() || null,
        formandoId: form.formandoId || null,
      };
      const url = editing ? `/api/compromissos/${editing.id}` : "/api/compromissos";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return toast.error((err as { error?: string }).error ?? "Erro ao salvar compromisso.");
      }
      toast.success(editing ? "Compromisso atualizado!" : "Compromisso criado!");
      setOpen(false);
      setForm(EMPTY);
      setEditing(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/compromissos/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) return toast.error("Erro ao excluir.");
      toast.success("Compromisso excluído.");
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Nota: o que a aba de compromissos pessoais faz */}
      <div className="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-foreground font-medium">Meus compromissos</p>
          <p>
            Sua agenda pessoal — reuniões, visitas e outros compromissos. Visível só para você e destacada em violeta no
            calendário do mês.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={openNovo}>
          <Plus className="h-4 w-4 mr-1.5" />
          Novo compromisso
        </Button>
      </div>

      {compromissos.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              icon={CalendarClock}
              title="Nenhum compromisso"
              description="Registre reuniões, visitas e outros compromissos pessoais para organizar o seu dia."
              action={
                <Button size="sm" onClick={openNovo}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Criar compromisso
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {compromissos.map((c) => {
            const inicio = parseISO(c.dataInicio);
            return (
              <Card key={c.id} className="border-0 shadow-sm">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-muted/40 text-center">
                    <span className="text-[10px] font-medium uppercase leading-none text-muted-foreground">{format(inicio, "MMM", { locale: ptBR })}</span>
                    <span className="text-base font-bold leading-tight text-foreground">{format(inicio, "dd")}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{c.titulo}</p>
                      <Badge variant="outline" className={`text-[10px] ${TIPO_COMPROMISSO_CORES[c.tipo]}`}>
                        {TIPO_COMPROMISSO_LABELS[c.tipo]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{format(inicio, "EEE, dd/MM 'às' HH:mm", { locale: ptBR })}</span>
                      {c.local && (<><span>·</span><MapPin className="h-3 w-3" /><span className="truncate">{c.local}</span></>)}
                      {!c.local && c.linkOnline && (<><span>·</span><Video className="h-3 w-3" /><span>Online</span></>)}
                      {c.formandoNome && (<><span>·</span><User className="h-3 w-3" /><span className="truncate">{c.formandoNome}</span></>)}
                    </p>
                    {c.descricao && <p className="mt-1 text-xs text-muted-foreground/80 line-clamp-2">{c.descricao}</p>}
                    <div className="mt-2 flex items-center gap-1">
                      <AdicionarAoCalendario
                        compact
                        event={{
                          id: c.id,
                          title: c.titulo,
                          start: c.dataInicio,
                          end: c.dataFim,
                          description: c.descricao,
                          location: c.local ?? (c.linkOnline ?? undefined),
                        }}
                      />
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        disabled={deletingId === c.id}
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Título <span className="text-destructive">*</span></Label>
              <Input value={form.titulo} onChange={(e) => set("titulo")(e.target.value)} placeholder="Ex.: Reunião com a coordenação" />
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => v && set("tipo")(v)}>
                <SelectTrigger>
                  <SelectValue>{TIPO_COMPROMISSO_LABELS[form.tipo]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_COMPROMISSO.map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_COMPROMISSO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Início <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={form.dataInicio} onChange={(e) => set("dataInicio")(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Fim</Label>
                <Input type="datetime-local" value={form.dataFim} onChange={(e) => set("dataFim")(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Local</Label>
                <Input value={form.local} onChange={(e) => set("local")(e.target.value)} placeholder="Endereço, sala..." />
              </div>
              <div className="grid gap-1.5">
                <Label>Link online</Label>
                <Input value={form.linkOnline} onChange={(e) => set("linkOnline")(e.target.value)} placeholder="https://..." />
              </div>
            </div>
            {formandosVinculo.length > 0 && (
              <div className="grid gap-1.5">
                <Label>Vincular a um {termoFormando.toLowerCase()} (opcional)</Label>
                <Select
                  value={form.formandoId || SEM_VINCULO}
                  onValueChange={(v) => set("formandoId")(!v || v === SEM_VINCULO ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {form.formandoId
                        ? (formandosVinculo.find((f) => f.id === form.formandoId)?.nome ?? "—")
                        : "Nenhum"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_VINCULO}>Nenhum</SelectItem>
                    {formandosVinculo.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => set("descricao")(e.target.value)} rows={3} placeholder="Detalhes (opcional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : editing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
