"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Sprout, Users, HeartHandshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isGestao } from "@/types";

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

      {turmas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma turma vocacional ainda.
            {gestao && " Crie a primeira turma para começar o acompanhamento."}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova turma vocacional</DialogTitle>
            <DialogDescription>
              A turma reutiliza a estrutura de grupos (agenda, presença, plano e grade).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Nome da turma *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Vocacional 2026" />
            </div>
            <div className="grid gap-1.5">
              <Label>Local de reunião</Label>
              <Input value={form.localReuniao} onChange={(e) => setForm({ ...form, localReuniao: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Formador responsável</Label>
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={form.formadorId}
                onChange={(e) => setForm({ ...form, formadorId: e.target.value })}
              >
                <option value="">— Selecionar —</option>
                {formadores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Plano formativo</Label>
                <select
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                  value={form.planoId}
                  onChange={(e) => setForm({ ...form, planoId: e.target.value })}
                >
                  <option value="">— Opcional —</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Grade formativa</Label>
                <select
                  className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                  value={form.gradeId}
                  onChange={(e) => setForm({ ...form, gradeId: e.target.value })}
                >
                  <option value="">— Opcional —</option>
                  {grades.map((g) => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                  ))}
                </select>
              </div>
            </div>
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
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={form.vocacionalAcompanhamentoAtivo}
                onChange={(e) => setForm({ ...form, vocacionalAcompanhamentoAtivo: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Oferecer acompanhamento individual nesta turma
            </label>
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
