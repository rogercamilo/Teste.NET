"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useEtapaLabels } from "@/lib/data-store";
import type { PlanoFormativo, GradeFormativa, Usuario } from "@/types";
import {
  MODALIDADE_LABELS,
  TIPO_FORMACAO_LABELS,
  type Formacao,
  type NivelFormativo,
  type Modalidade,
  type TipoFormacao,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Paperclip, Upload, X } from "lucide-react";
import { toast } from "sonner";

type FormState = {
  tema: string;
  objetivo: string;
  descricao: string;
  nivelFormativo: NivelFormativo;
  tipoFormacao: TipoFormacao;
  formadorId: string;
  cargaHoraria: string;
  modalidade: Modalidade;
  gradeId: string;
  eixoId: string;
  eixoNome: string;
  numero: string;
  observacoesFormador: string;
  materialApoio: string;
  documentoNome: string;
  documentoId: string;
};

const EMPTY_FORM: FormState = {
  tema: "",
  objetivo: "",
  descricao: "",
  nivelFormativo: "pre-discipulado",
  tipoFormacao: "comunitaria",
  formadorId: "",
  cargaHoraria: "2",
  modalidade: "presencial",
  gradeId: "",
  eixoId: "",
  eixoNome: "",
  numero: "",
  observacoesFormador: "",
  materialApoio: "",
  documentoNome: "",
  documentoId: "",
};

interface FormacaoFormPageProps {
  id?: string;
  initialFormacao?: Formacao;
  initialGrades?: GradeFormativa[];
  initialPlanos?: PlanoFormativo[];
  initialUsuarios?: Usuario[];
}

export default function FormacaoFormPage({
  id,
  initialFormacao,
  initialGrades = [],
  initialPlanos = [],
  initialUsuarios = [],
}: FormacaoFormPageProps) {
  const router = useRouter();
  const formadores = initialUsuarios.filter((u) => u.ativo);
  const etapaLabels = useEtapaLabels();
  const isEditing = !!id;

  const [form, setForm] = useState<FormState>(() => {
    if (initialFormacao) {
      return {
        tema: initialFormacao.tema,
        objetivo: initialFormacao.objetivo,
        descricao: initialFormacao.descricao,
        nivelFormativo: initialFormacao.nivelFormativo,
        tipoFormacao: initialFormacao.tipoFormacao,
        formadorId: initialFormacao.formadorId,
        cargaHoraria: String(initialFormacao.cargaHoraria),
        modalidade: initialFormacao.modalidade,
        gradeId: initialFormacao.gradeId ?? "",
        eixoId: initialFormacao.eixoId ?? "",
        eixoNome: initialFormacao.eixoNome ?? "",
        numero: initialFormacao.numero ? String(initialFormacao.numero) : "",
        observacoesFormador: initialFormacao.observacoesFormador ?? "",
        materialApoio: initialFormacao.materialApoio ?? "",
        documentoNome: initialFormacao.documentoAnexo ?? "",
        documentoId: initialFormacao.documentoAnexoId ?? "",
      };
    }
    return EMPTY_FORM;
  });
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Eixos da grade selecionada, com nomeEtapa resolvido
  const gradeAtual = initialGrades.find((g) => g.id === form.gradeId);
  const planoAtual = initialPlanos.find((p) => p.id === gradeAtual?.planoId);
  const eixosDaGrade = gradeAtual?.eixos.map((e) => {
    const ep = planoAtual?.eixos.find((ep) => ep.id === e.eixoPlanoId);
    return { id: e.id, nome: e.nome, label: ep?.nomeEtapa ?? e.nome };
  }) ?? [];

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handleGradeChange(gradeId: string) {
    const grade = initialGrades.find((g) => g.id === gradeId);
    setForm((prev) => ({
      ...prev,
      gradeId,
      eixoId: "",
      eixoNome: "",
      numero: prev.numero || "1",
      nivelFormativo: (grade?.nivelFormativo as NivelFormativo) ?? prev.nivelFormativo,
    }));
  }

  function handleEixoChange(eixoId: string) {
    const eixo = eixosDaGrade.find((e) => e.id === eixoId);
    setForm((prev) => ({ ...prev, eixoId, eixoNome: eixo?.nome ?? "" }));
  }

  function handleDocumentoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentoFile(file);
    setForm((prev) => ({ ...prev, documentoNome: file.name, documentoId: "" }));
    toast.success("Documento selecionado. Será salvo ao confirmar.");
  }

  function removerDocumento() {
    setDocumentoFile(null);
    setForm((prev) => ({ ...prev, documentoNome: "", documentoId: "" }));
  }

  async function handleSave() {
    if (!form.tema.trim()) return toast.error("Tema é obrigatório.");
    if (!form.formadorId) return toast.error("Selecione um formador.");
    const horas = Number(form.cargaHoraria);
    if (!horas || horas <= 0) return toast.error("Carga horária inválida.");

    setSaving(true);
    try {
      const formador = formadores.find((u) => u.id === form.formadorId);
      const gradeVinculada = initialGrades.find((g) => g.id === form.gradeId);
      const JSON_H = { "Content-Type": "application/json" };

      const basePayload = {
        tema: form.tema.trim(),
        objetivo: form.objetivo.trim(),
        descricao: form.descricao.trim(),
        nivelFormativo: form.nivelFormativo,
        tipoFormacao: form.tipoFormacao,
        formadorId: form.formadorId,
        formadorNome: formador?.nome ?? "",
        cargaHoraria: horas,
        modalidade: form.modalidade,
        gradeId: form.gradeId || undefined,
        gradeNome: gradeVinculada?.nome || undefined,
        eixoId: form.eixoId || undefined,
        eixoNome: form.eixoNome.trim() || undefined,
        numero: form.numero ? Number(form.numero) : undefined,
        observacoesFormador: form.observacoesFormador.trim() || undefined,
        materialApoio: form.materialApoio.trim() || undefined,
      };

      if (isEditing && id) {
        // EDIT: entity already exists — upload document first, then PUT
        let documentoAnexo = form.documentoNome || undefined;
        let documentoAnexoId = form.documentoId || undefined;

        if (documentoFile) {
          const fd = new FormData();
          fd.append("file", documentoFile);
          fd.append("entityType", "formacao");
          fd.append("entityId", id);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (!uploadRes.ok) { toast.error(`Erro ao enviar documento: ${await uploadRes.text()}`); return; }
          const uploaded = await uploadRes.json() as { id: string; nome: string };
          if (initialFormacao?.documentoAnexoId) {
            fetch(`/api/arquivos/${initialFormacao.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
          }
          documentoAnexo = uploaded.nome;
          documentoAnexoId = uploaded.id;
        } else if (!form.documentoNome && initialFormacao?.documentoAnexoId) {
          fetch(`/api/arquivos/${initialFormacao.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
          documentoAnexo = undefined;
          documentoAnexoId = undefined;
        }

        const res = await fetch(`/api/formacoes/${id}`, {
          method: "PUT",
          headers: JSON_H,
          body: JSON.stringify({ ...basePayload, documentoAnexo, documentoAnexoId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error ?? "Falha ao atualizar formação");
        }
        toast.success("Formação atualizada com sucesso!");
        router.push(`/formacoes/${id}`);
        router.refresh();
      } else {
        // CREATE: create first to get real ID, then upload document
        const createRes = await fetch("/api/formacoes", {
          method: "POST",
          headers: JSON_H,
          body: JSON.stringify(basePayload),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error ?? "Falha ao criar formação");
        }
        let created = await createRes.json() as { id: string };

        if (documentoFile) {
          const fd = new FormData();
          fd.append("file", documentoFile);
          fd.append("entityType", "formacao");
          fd.append("entityId", created.id);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (uploadRes.ok) {
            const uploaded = await uploadRes.json() as { id: string; nome: string };
            const updateRes = await fetch(`/api/formacoes/${created.id}`, {
              method: "PUT",
              headers: JSON_H,
              body: JSON.stringify({ ...basePayload, documentoAnexo: uploaded.nome, documentoAnexoId: uploaded.id }),
            });
            if (updateRes.ok) created = await updateRes.json();
          } else {
            toast.warning("Formação criada, mas o documento não pôde ser anexado.");
          }
        }

        toast.success("Formação criada com sucesso!");
        router.push(`/formacoes/${created.id}`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(isEditing ? `/formacoes/${id}` : "/formacoes")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-foreground mb-6">
          {isEditing ? "Editar Formação" : "Nova Formação"}
        </h1>

        <div className="grid gap-4">
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
              <Label>Tipo de Formação <span className="text-destructive">*</span></Label>
              <Select value={form.tipoFormacao} onValueChange={(v) => v && set("tipoFormacao")(v)} items={TIPO_FORMACAO_LABELS}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_FORMACAO_LABELS) as TipoFormacao[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_FORMACAO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
              <Select value={form.nivelFormativo} onValueChange={(v) => v && set("nivelFormativo")(v)} items={etapaLabels}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((n) => (
                    <SelectItem key={n} value={n}>{etapaLabels[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Formador <span className="text-destructive">*</span></Label>
            <Select value={form.formadorId} onValueChange={(v) => v && set("formadorId")(v)} items={Object.fromEntries(formadores.map((u) => [u.id, u.nome]))}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {formadores.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Carga horária (h) <span className="text-destructive">*</span></Label>
              <Input type="number" min="1" value={form.cargaHoraria} onChange={(e) => set("cargaHoraria")(e.target.value)} placeholder="2" />
            </div>
            <div className="grid gap-1.5">
              <Label>Modalidade</Label>
              <Select value={form.modalidade} onValueChange={(v) => v && set("modalidade")(v)} items={MODALIDADE_LABELS}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODALIDADE_LABELS) as Modalidade[]).map((m) => (
                    <SelectItem key={m} value={m}>{MODALIDADE_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Vínculo com grade formativa ── */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vínculo com grade formativa</p>

            <div className="grid gap-1.5">
              <Label>Grade formativa</Label>
              <Select
                value={form.gradeId}
                onValueChange={(v) => v && handleGradeChange(v)}
                items={Object.fromEntries(initialGrades.map((g) => [g.id, g.nome]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar grade (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  {initialGrades.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      <span>{g.nome}</span>
                      <span className="ml-2 text-xs text-muted-foreground">({etapaLabels[g.nivelFormativo]})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.gradeId && (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, gradeId: "", eixoId: "", eixoNome: "", numero: "" }))}
                  className="text-xs text-muted-foreground hover:text-destructive text-left"
                >
                  Remover vínculo com grade
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Etapa (eixo)</Label>
                {eixosDaGrade.length > 0 ? (
                  <Select
                    value={form.eixoId}
                    onValueChange={(v) => v && handleEixoChange(v)}
                    items={Object.fromEntries(eixosDaGrade.map((e) => [e.id, e.label]))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar etapa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eixosDaGrade.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.eixoNome}
                    onChange={(e) => set("eixoNome")(e.target.value)}
                    placeholder="Ex.: Identidade"
                  />
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>N° na grade</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.numero}
                  onChange={(e) => set("numero")(e.target.value)}
                  placeholder="—"
                  disabled={!form.gradeId}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Observações do formador</Label>
              <Textarea
                value={form.observacoesFormador}
                onChange={(e) => set("observacoesFormador")(e.target.value)}
                placeholder="Contexto, instruções ou notas para quem ministrará esta formação..."
                className="min-h-[60px] resize-none text-sm"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Material de apoio</Label>
            <Input value={form.materialApoio} onChange={(e) => set("materialApoio")(e.target.value)} placeholder="Link ou referência" />
          </div>

          <div className="grid gap-1.5">
            <Label>Documento da formação</Label>
            {form.documentoNome ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{form.documentoNome}</span>
                {documentoFile && (
                  <span className="text-xs text-amber-600 shrink-0">pendente de salvar</span>
                )}
                <button type="button" onClick={removerDocumento} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Selecionar PDF ou Word (.pdf, .docx, .doc)</span>
                <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={handleDocumentoInput} />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/60">
          <Button variant="outline" onClick={() => router.push(isEditing ? `/formacoes/${id}` : "/formacoes")} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</> : isEditing ? "Salvar alterações" : "Criar formação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
