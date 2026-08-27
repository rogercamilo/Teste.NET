"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Clock, HeartHandshake, Info, Library, MapPin, Plus, Sprout, Type, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconField } from "@/components/forms/icon-field";
import { isGestao } from "@/types";
import { useTermos } from "@/lib/data-store";

/** Sentinela para a opção "nenhum" nos selects (base-ui não aceita value vazio). */
const NENHUM = "__nenhum__";

interface Option {
  id: string;
  nome: string;
}

interface TurmaRow {
  id: string;
  nome: string;
  localReuniao: string | null;
  formadorNome: string | null;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  vocacionalDuracaoMeses: number | null;
  vocacionalTotalRetiros: number | null;
  vocacionalAcompanhamentoAtivo: boolean;
  totalParticipantes: number;
}

interface Props {
  userRole: string;
  termoVocacional: string;
  formadores: Option[];
  planos: Option[];
  grades: Option[];
  turmas: TurmaRow[];
}

export default function VocacionalClient({ userRole, termoVocacional, formadores, planos, grades, turmas }: Props) {
  const router = useRouter();
  const { formador: termoFormador } = useTermos();
  const gestao = isGestao(userRole);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    localReuniao: "",
    formadorId: "",
    planoId: "",
    gradeId: "",
    vigenciaInicio: new Date().toISOString().slice(0, 10),
    vocacionalDuracaoMeses: 12,
    vocacionalTotalRetiros: 2,
    vocacionalAcompanhamentoAtivo: true,
  });

  async function handleCreate() {
    if (!form.nome.trim()) return toast.error("Informe o nome da turma.");
    setSaving(true);
    try {
      const res = await fetch("/api/vocacional/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          localReuniao: form.localReuniao.trim() || undefined,
          formadorId: form.formadorId || undefined,
          planoId: form.planoId || undefined,
          gradeId: form.gradeId || undefined,
          vigenciaInicio: form.vigenciaInicio || undefined,
          vocacionalDuracaoMeses: form.vocacionalDuracaoMeses,
          vocacionalTotalRetiros: form.vocacionalTotalRetiros,
          vocacionalAcompanhamentoAtivo: form.vocacionalAcompanhamentoAtivo,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Falha ao criar turma");
      }
      toast.success("Turma vocacional criada!");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar turma");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Sprout className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{termoVocacional}</h1>
            <p className="text-sm text-muted-foreground">
              Turmas de discernimento e acompanhamento dos vocacionados.
            </p>
          </div>
        </div>
        {gestao && (
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nova turma
          </Button>
        )}
      </div>

      {/* Nota: o que é a seção e como se conecta */}
      <div className="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-foreground font-medium">Como esta seção funciona</p>
          <p>
            Reúne as turmas de discernimento vocacional — grupos onde os vocacionados são acompanhados por um período
            (com retiros, leituras e acompanhamento individual) antes do pedido de ingresso. Cada turma reutiliza a
            estrutura dos grupos de formação (agenda, presença, plano e grade), então o dia a dia é o mesmo que você já
            conhece.
          </p>
          <p>
            Abra uma turma para inscrever vocacionados, registrar a carta de discernimento e conduzir o desfecho — cada
            passo lavra o termo correspondente no Livro de Registro. O acompanhamento individual é sigiloso (foro
            íntimo): o vocacionado não o vê.
          </p>
        </div>
      </div>

      {turmas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Sprout}
              title="Nenhuma turma vocacional"
              description={
                gestao
                  ? "Crie a primeira turma para começar o acompanhamento vocacional dos participantes."
                  : "Ainda não há turmas vocacionais para acompanhar."
              }
              action={
                gestao ? (
                  <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
                    <Plus className="h-4 w-4" /> Nova turma
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((t) => {
            const ativa = !t.vigenciaFim;
            return (
              <button
                key={t.id}
                onClick={() => router.push(`/vocacional/${t.id}`)}
                className="text-left rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-sm leading-snug">{t.nome}</h2>
                  <Badge variant={ativa ? "default" : "outline"} className="text-[10px] shrink-0">
                    {ativa ? "Em curso" : "Encerrada"}
                  </Badge>
                </div>
                {t.formadorNome && (
                  <p className="mt-1 text-xs text-muted-foreground">Formador: {t.formadorNome}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {t.totalParticipantes} vocacionado(s)
                  </span>
                  {t.vocacionalAcompanhamentoAtivo && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <HeartHandshake className="h-3.5 w-3.5" /> Acompanhamento
                    </span>
                  )}
                </div>
                {(t.vocacionalDuracaoMeses || t.vocacionalTotalRetiros != null) && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t.vocacionalDuracaoMeses ? `${t.vocacionalDuracaoMeses} meses` : ""}
                    {t.vocacionalDuracaoMeses && t.vocacionalTotalRetiros != null ? " · " : ""}
                    {t.vocacionalTotalRetiros != null ? `${t.vocacionalTotalRetiros} retiro(s)` : ""}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova turma vocacional</DialogTitle>
            <DialogDescription>
              A turma reutiliza a estrutura de grupos (agenda, presença, plano e grade).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <IconField icon={Type} label="Nome da turma" required>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Vocacional 2026" />
            </IconField>
            <IconField icon={MapPin} label="Local de reunião">
              <Input value={form.localReuniao} onChange={(e) => setForm({ ...form, localReuniao: e.target.value })} />
            </IconField>
            <IconField icon={User} label={`${termoFormador} responsável`}>
              <Select
                value={form.formadorId || NENHUM}
                onValueChange={(v) => setForm({ ...form, formadorId: !v || v === NENHUM ? "" : v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {form.formadorId ? (formadores.find((f) => f.id === form.formadorId)?.nome ?? "—") : "— Selecionar —"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NENHUM}>— Selecionar —</SelectItem>
                  {formadores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IconField>
            <IconField icon={BookOpen}>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Plano formativo</Label>
                  <Select
                    value={form.planoId || NENHUM}
                    onValueChange={(v) => setForm({ ...form, planoId: !v || v === NENHUM ? "" : v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {form.planoId ? (planos.find((p) => p.id === form.planoId)?.nome ?? "—") : "— Opcional —"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NENHUM}>— Opcional —</SelectItem>
                      {planos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Library className="h-3.5 w-3.5 text-muted-foreground" /> Grade formativa
                  </Label>
                  <Select
                    value={form.gradeId || NENHUM}
                    onValueChange={(v) => setForm({ ...form, gradeId: !v || v === NENHUM ? "" : v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {form.gradeId ? (grades.find((g) => g.id === form.gradeId)?.nome ?? "—") : "— Opcional —"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NENHUM}>— Opcional —</SelectItem>
                      {grades.map((g) => (
                        <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </IconField>
            <IconField icon={Clock}>
              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5">
                  <Label>Início</Label>
                  <Input type="date" value={form.vigenciaInicio} onChange={(e) => setForm({ ...form, vigenciaInicio: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Duração (meses)</Label>
                  <Input type="number" min={1} max={24} value={form.vocacionalDuracaoMeses} onChange={(e) => setForm({ ...form, vocacionalDuracaoMeses: parseInt(e.target.value, 10) || 0 })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Retiros</Label>
                  <Input type="number" min={0} max={50} value={form.vocacionalTotalRetiros} onChange={(e) => setForm({ ...form, vocacionalTotalRetiros: parseInt(e.target.value, 10) || 0 })} />
                </div>
              </div>
            </IconField>
            <IconField icon={HeartHandshake}>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.vocacionalAcompanhamentoAtivo}
                  onChange={(e) => setForm({ ...form, vocacionalAcompanhamentoAtivo: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Oferecer acompanhamento individual nesta turma
              </label>
            </IconField>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>{saving ? "Criando…" : "Criar turma"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
