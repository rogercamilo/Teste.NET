"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormacoes, useEtapaLabels, useUsuarios } from "@/lib/data-store";
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
  eixoNome: string;
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
  eixoNome: "",
  materialApoio: "",
  documentoNome: "",
  documentoId: "",
};

export default function FormacaoFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [formacoes, setFormacoes] = useFormacoes();
  const [allUsuarios] = useUsuarios();
  const formadores = allUsuarios.filter((u) => u.ativo);
  const etapaLabels = useEtapaLabels();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);
  const isEditing = !!id;

  useEffect(() => {
    if (!id || initialized.current) return;
    const f = formacoes.find((x) => x.id === id);
    if (!f) return;
    setForm({
      tema: f.tema,
      objetivo: f.objetivo,
      descricao: f.descricao,
      nivelFormativo: f.nivelFormativo,
      tipoFormacao: f.tipoFormacao,
      formadorId: f.formadorId,
      cargaHoraria: String(f.cargaHoraria),
      modalidade: f.modalidade,
      eixoNome: f.eixoNome ?? "",
      materialApoio: f.materialApoio ?? "",
      documentoNome: f.documentoAnexo ?? "",
      documentoId: f.documentoAnexoId ?? "",
    });
    initialized.current = true;
  }, [id, formacoes]);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

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
      const today = new Date().toISOString().split("T")[0];
      const entId = id ?? `fm${Date.now()}`;
      const existing = isEditing ? formacoes.find((f) => f.id === id) : undefined;

      let documentoAnexo = form.documentoNome || undefined;
      let documentoAnexoId = form.documentoId || undefined;

      if (documentoFile) {
        const fd = new FormData();
        fd.append("file", documentoFile);
        fd.append("entityType", "formacao");
        fd.append("entityId", entId);
        const res = await fetch("/api/arquivos", { method: "POST", body: fd });
        if (!res.ok) {
          toast.error(`Erro ao enviar documento: ${await res.text()}`);
          return;
        }
        const uploaded = await res.json() as { id: string; nome: string };
        if (existing?.documentoAnexoId) {
          fetch(`/api/arquivos/${existing.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
        }
        documentoAnexo = uploaded.nome;
        documentoAnexoId = uploaded.id;
      } else if (!form.documentoNome && existing?.documentoAnexoId) {
        fetch(`/api/arquivos/${existing.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
        documentoAnexo = undefined;
        documentoAnexoId = undefined;
      }

      const payload: Formacao = {
        id: entId,
        tema: form.tema.trim(),
        objetivo: form.objetivo.trim(),
        descricao: form.descricao.trim(),
        nivelFormativo: form.nivelFormativo,
        tipoFormacao: form.tipoFormacao,
        formadorId: form.formadorId,
        formadorNome: formador?.nome ?? "",
        cargaHoraria: horas,
        modalidade: form.modalidade,
        eixoNome: form.eixoNome.trim() || undefined,
        materialApoio: form.materialApoio.trim() || undefined,
        documentoAnexo,
        documentoAnexoId,
        vezesUtilizada: existing?.vezesUtilizada ?? 0,
        criadoEm: existing?.criadoEm ?? today,
      };

      if (isEditing && id) {
        setFormacoes((prev) => prev.map((f) => (f.id === id ? payload : f)));
        toast.success("Formação atualizada com sucesso!");
        router.push(`/formacoes/${id}`);
      } else {
        setFormacoes((prev) => [...prev, payload]);
        toast.success("Formação criada com sucesso!");
        router.push("/formacoes");
      }
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

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Carga horária (h) <span className="text-destructive">*</span></Label>
              <Input type="number" min="1" value={form.cargaHoraria} onChange={(e) => set("cargaHoraria")(e.target.value)} placeholder="2" />
            </div>
            <div className="grid gap-1.5">
              <Label>Eixo</Label>
              <Input value={form.eixoNome} onChange={(e) => set("eixoNome")(e.target.value)} placeholder="Ex.: Identidade" />
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
