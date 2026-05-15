"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlanos } from "@/lib/data-store";
import { extractDocumentFields } from "@/lib/doc-extract";
import {
  STATUS_PLANO_LABELS,
  NIVEL_FORMATIVO_LABELS,
  type StatusPlano,
  type NivelFormativo,
  type EixoPlano,
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
import { ArrowLeft, Paperclip, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";

type FormState = {
  nome: string;
  objetivos: string;
  fundamentacao: string;
  nivelFormativo: NivelFormativo;
  vigenciaInicio: string;
  vigenciaFim: string;
  status: StatusPlano;
  eixos: EixoPlano[];
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
  eixos: [],
  documentoNome: "",
  documentoUrl: "",
};

const NIVEIS: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

export default function PlanoFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [planos, setPlanos] = usePlanos();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [extracting, setExtracting] = useState(false);
  const initialized = useRef(false);
  const isEditing = !!id;

  useEffect(() => {
    if (!id || initialized.current) return;
    const p = planos.find((x) => x.id === id);
    if (!p) return;
    setForm({
      nome: p.nome,
      objetivos: p.objetivos,
      fundamentacao: p.fundamentacao,
      nivelFormativo: p.nivelFormativo,
      vigenciaInicio: p.vigenciaInicio,
      vigenciaFim: p.vigenciaFim,
      status: p.status,
      eixos: p.eixos,
      documentoNome: p.documentoAnexo ?? "",
      documentoUrl: localStorage.getItem(`doc_${id}`) ?? "",
    });
    initialized.current = true;
  }, [id, planos]);

  const set = (field: keyof Omit<FormState, "eixos">) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function addEixo() {
    setForm((prev) => ({
      ...prev,
      eixos: [
        ...prev.eixos,
        { id: `ep${Date.now()}`, nome: "", objetivo: "", intervaloEncontros: "", cargaHoraria: 2, areaFormacao: "" },
      ],
    }));
  }

  function removeEixo(eixoId: string) {
    setForm((prev) => ({ ...prev, eixos: prev.eixos.filter((e) => e.id !== eixoId) }));
  }

  function updateEixo(eixoId: string, field: keyof EixoPlano, value: string) {
    setForm((prev) => ({
      ...prev,
      eixos: prev.eixos.map((e) =>
        e.id === eixoId
          ? { ...e, [field]: field === "cargaHoraria" ? Number(value) || 0 : value }
          : e
      ),
    }));
  }

  async function handleDocumentoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const { objetivos, fundamentacao, dataUrl } = await extractDocumentFields(file);
      setForm((prev) => {
        const next = { ...prev, documentoNome: file.name, documentoUrl: dataUrl };
        if (objetivos && !prev.objetivos.trim()) next.objetivos = objetivos;
        if (fundamentacao && !prev.fundamentacao.trim()) next.fundamentacao = fundamentacao;
        return next;
      });
      toast.success("Documento anexado com sucesso.");
    } finally {
      setExtracting(false);
    }
  }

  function removerDocumento() {
    setForm((prev) => ({ ...prev, documentoNome: "", documentoUrl: "" }));
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
      eixos: form.eixos,
      documentoAnexo: form.documentoNome || undefined,
    };

    if (isEditing && id) {
      setPlanos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...payload, atualizadoEm: today } : p))
      );
      if (form.documentoUrl) {
        localStorage.setItem(`doc_${id}`, form.documentoUrl);
      } else if (!form.documentoNome) {
        localStorage.removeItem(`doc_${id}`);
      }
      toast.success("Plano atualizado com sucesso!");
      router.push(`/planos/${id}`);
    } else {
      const newId = `p${Date.now()}`;
      setPlanos((prev) => [
        ...prev,
        { id: newId, ...payload, criadoEm: today, atualizadoEm: today },
      ]);
      if (form.documentoUrl) localStorage.setItem(`doc_${newId}`, form.documentoUrl);
      toast.success("Plano criado com sucesso!");
      router.push("/planos");
    }
  }

  const conflito = planos.find((p) => p.nivelFormativo === form.nivelFormativo && p.id !== id);

  return (
    <div className="max-w-2xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(isEditing ? `/planos/${id}` : "/planos")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-foreground mb-6">
          {isEditing ? "Editar Plano Formativo" : "Novo Plano Formativo"}
        </h1>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nome <span className="text-destructive">*</span></Label>
            <Input value={form.nome} onChange={(e) => set("nome")(e.target.value)} placeholder="Plano Formativo 2025 — Discipulado" />
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
            {conflito && (
              <p className="text-xs text-amber-600">
                Já existe um plano para esta etapa: <span className="font-medium">{conflito.nome}</span>
              </p>
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
            <Label>Objetivos</Label>
            <Textarea value={form.objetivos} onChange={(e) => set("objetivos")(e.target.value)} placeholder="Objetivos gerais do plano..." className="min-h-20 resize-none" />
          </div>

          <div className="grid gap-1.5">
            <Label>Fundamentação</Label>
            <Textarea value={form.fundamentacao} onChange={(e) => set("fundamentacao")(e.target.value)} placeholder="Base teológica e pedagógica..." className="min-h-16 resize-none" />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Eixos Formativos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addEixo} className="h-7 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Adicionar eixo
              </Button>
            </div>
            {form.eixos.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-lg">
                Nenhum eixo adicionado.
              </p>
            )}
            <div className="space-y-3">
              {form.eixos.map((eixo, idx) => (
                <div key={eixo.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Eixo {idx + 1}</span>
                    <button type="button" onClick={() => removeEixo(eixo.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Nome</Label>
                      <Input className="h-8 text-xs" value={eixo.nome} onChange={(e) => updateEixo(eixo.id, "nome", e.target.value)} placeholder="Ex.: Identidade" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Área de Formação</Label>
                      <Input className="h-8 text-xs" value={eixo.areaFormacao} onChange={(e) => updateEixo(eixo.id, "areaFormacao", e.target.value)} placeholder="Ex.: Espiritual" />
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Objetivo</Label>
                    <Textarea className="min-h-12 text-xs resize-none" value={eixo.objetivo} onChange={(e) => updateEixo(eixo.id, "objetivo", e.target.value)} placeholder="Objetivo do eixo..." />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Intervalo de Encontros</Label>
                      <Input className="h-8 text-xs" value={eixo.intervaloEncontros} onChange={(e) => updateEixo(eixo.id, "intervaloEncontros", e.target.value)} placeholder="Ex.: Encontros 1 a 4" />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Carga Horária (h)</Label>
                      <Input type="number" min="1" className="h-8 text-xs" value={String(eixo.cargaHoraria)} onChange={(e) => updateEixo(eixo.id, "cargaHoraria", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="flex items-center gap-2">
              Documento do plano
              {extracting && <span className="text-xs text-primary animate-pulse">Lendo documento…</span>}
            </Label>
            {form.documentoNome ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{form.documentoNome}</span>
                <button type="button" onClick={removerDocumento} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className={`flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-muted/20 transition-colors ${extracting ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/40"}`}>
                <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Selecionar PDF ou Word (.pdf, .docx, .doc)</span>
                <input type="file" accept=".pdf,.docx,.doc" className="hidden" disabled={extracting} onChange={handleDocumentoInput} />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-border/60">
          <Button variant="outline" onClick={() => router.push(isEditing ? `/planos/${id}` : "/planos")}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? "Salvar alterações" : "Criar plano"}
          </Button>
        </div>
      </div>
    </div>
  );
}
