"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { usePlanos, useEtapaLabels, db } from "@/lib/data-store";
import {
  STATUS_PLANO_LABELS,
  type StatusPlano,
  type NivelFormativo,
  type EixoPlano,
  type RetiroPlano,
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
import { ArrowLeft, Loader2, Paperclip, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";

type FormState = {
  nome: string;
  objetivos: string;
  fundamentacao: string;
  nivelFormativo: NivelFormativo;
  status: StatusPlano;
  eixos: EixoPlano[];
  retiros: RetiroPlano[];
  documentoNome: string;
  documentoId: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  objetivos: "",
  fundamentacao: "",
  nivelFormativo: "pre-discipulado",
  status: "rascunho",
  eixos: [],
  retiros: [],
  documentoNome: "",
  documentoId: "",
};

const NIVEIS: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

function makeEixo(ordem: number): EixoPlano {
  return {
    id: `ep${Date.now()}-${ordem}`,
    nome: "",
    nomeEtapa: "",
    objetivo: "",
    intervaloEncontros: "",
    cargaHoraria: 2,
    areaFormacao: "",
    ordem,
  };
}

function makeRetiro(tipo: "comunitario" | "pessoal", numero: number, planoId = ""): RetiroPlano {
  return {
    id: `rp${Date.now()}-${numero}`,
    planoId,
    tipo,
    numero,
    tema: "",
    trechoBiblico: "",
    objetivo: "",
    quandoRealizar: "",
    cargaHoraria: tipo === "comunitario" ? 16 : 4,
  };
}

export default function PlanoFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const [planos] = usePlanos();
  const etapaLabels = useEtapaLabels();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
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
      status: p.status,
      eixos: p.eixos,
      retiros: p.retiros ?? [],
      documentoNome: p.documentoAnexo ?? "",
      documentoId: p.documentoAnexoId ?? "",
    });
    initialized.current = true;
  }, [id, planos]);

  const set = (field: keyof Omit<FormState, "eixos" | "retiros">) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // ── Eixos ──────────────────────────────────────────────────────────────────
  function addEixo() {
    setForm((prev) => ({
      ...prev,
      eixos: [...prev.eixos, makeEixo(prev.eixos.length)],
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

  // ── Retiros ────────────────────────────────────────────────────────────────
  function addRetiro(tipo: "comunitario" | "pessoal") {
    setForm((prev) => {
      const numero = prev.retiros.filter((r) => r.tipo === tipo).length + 1;
      return { ...prev, retiros: [...prev.retiros, makeRetiro(tipo, numero, id ?? "")] };
    });
  }

  function removeRetiro(retiroId: string) {
    setForm((prev) => {
      const filtered = prev.retiros.filter((r) => r.id !== retiroId);
      // Re-number within each tipo
      const renumbered = filtered.map((r) => {
        const sameType = filtered.filter((x) => x.tipo === r.tipo);
        return { ...r, numero: sameType.indexOf(r) + 1 };
      });
      return { ...prev, retiros: renumbered };
    });
  }

  function updateRetiro(retiroId: string, field: keyof RetiroPlano, value: string) {
    setForm((prev) => ({
      ...prev,
      retiros: prev.retiros.map((r) =>
        r.id === retiroId
          ? { ...r, [field]: field === "cargaHoraria" || field === "numero" ? Number(value) || 0 : value }
          : r
      ),
    }));
  }

  // ── Documento ──────────────────────────────────────────────────────────────
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

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");

    setSaving(true);
    try {
      const basePayload = {
        nome: form.nome.trim(),
        objetivos: form.objetivos.trim(),
        fundamentacao: form.fundamentacao.trim(),
        nivelFormativo: form.nivelFormativo,
        status: form.status,
        eixos: form.eixos,
        retiros: form.retiros,
      };

      if (isEditing && id) {
        // EDIT: entity already exists — upload document first, then PUT
        const original = planos.find((p) => p.id === id);
        let documentoAnexo = form.documentoNome || undefined;
        let documentoAnexoId = form.documentoId || undefined;

        if (documentoFile) {
          const fd = new FormData();
          fd.append("file", documentoFile);
          fd.append("entityType", "plano");
          fd.append("entityId", id);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (!uploadRes.ok) {
            toast.error(`Erro ao enviar documento: ${await uploadRes.text()}`);
            return;
          }
          const uploaded = await uploadRes.json() as { id: string; nome: string };
          if (original?.documentoAnexoId) {
            fetch(`/api/arquivos/${original.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
          }
          documentoAnexo = uploaded.nome;
          documentoAnexoId = uploaded.id;
        } else if (!form.documentoNome && original?.documentoAnexoId) {
          fetch(`/api/arquivos/${original.documentoAnexoId}`, { method: "DELETE" }).catch(() => null);
          documentoAnexo = undefined;
          documentoAnexoId = undefined;
        }

        const res = await fetch(`/api/planos/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...basePayload, documentoAnexo, documentoAnexoId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || "Erro ao atualizar plano");
          return;
        }
        const updated = await res.json();
        db.planos.save(db.planos.load().map((p) => (p.id === id ? updated : p)));
        toast.success("Plano atualizado com sucesso!");
        router.push(`/planos/${id}`);
      } else {
        // CREATE: create plan first to get real ID, then upload document
        const createRes = await fetch("/api/planos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(basePayload),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || "Erro ao criar plano");
          return;
        }
        let created = await createRes.json();

        if (documentoFile) {
          const fd = new FormData();
          fd.append("file", documentoFile);
          fd.append("entityType", "plano");
          fd.append("entityId", created.id);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (!uploadRes.ok) {
            // Plan created but document failed — navigate anyway, user can add later
            toast.warning(`Plano criado, mas o documento não pôde ser anexado: ${await uploadRes.text()}`);
            db.planos.save([...db.planos.load(), created]);
            router.push("/planos");
            return;
          }
          const uploaded = await uploadRes.json() as { id: string; nome: string };
          // Link document to the newly created plan
          const updateRes = await fetch(`/api/planos/${created.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...basePayload, documentoAnexo: uploaded.nome, documentoAnexoId: uploaded.id }),
          });
          if (updateRes.ok) created = await updateRes.json();
        }

        db.planos.save([...db.planos.load(), created]);
        toast.success("Plano criado com sucesso!");
        router.push("/planos");
      }
    } catch {
      toast.error("Falha de rede. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const conflito = planos.find((p) => p.nivelFormativo === form.nivelFormativo && p.id !== id);
  const retirosComunitarios = form.retiros.filter((r) => r.tipo === "comunitario");
  const retirosPessoais = form.retiros.filter((r) => r.tipo === "pessoal");

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

      {/* ── Dados gerais ────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-foreground mb-6">
          {isEditing ? "Editar Plano Formativo" : "Novo Plano Formativo"}
        </h1>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Nome <span className="text-destructive">*</span></Label>
            <Input
              value={form.nome}
              onChange={(e) => set("nome")(e.target.value)}
              placeholder="Plano Formativo 2025 — Discipulado"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Etapa Formativa <span className="text-destructive">*</span></Label>
              <Select value={form.nivelFormativo} onValueChange={(v) => v && set("nivelFormativo")(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NIVEIS.map((n) => (
                    <SelectItem key={n} value={n}>{etapaLabels[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conflito && (
                <p className="text-xs text-amber-600">
                  Já existe um plano para esta etapa: <span className="font-medium">{conflito.nome}</span>
                </p>
              )}
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
          </div>

          <div className="grid gap-1.5">
            <Label>Objetivos</Label>
            <Textarea
              value={form.objetivos}
              onChange={(e) => set("objetivos")(e.target.value)}
              placeholder="Objetivos gerais do plano..."
              className="min-h-20 resize-none"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Fundamentação</Label>
            <Textarea
              value={form.fundamentacao}
              onChange={(e) => set("fundamentacao")(e.target.value)}
              placeholder="Base teológica e pedagógica..."
              className="min-h-16 resize-none"
            />
          </div>
        </div>
      </div>

      {/* ── Seção 1: Encontros Semanais (Eixos Formativos) ──────────────── */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Encontros Semanais</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direcionamentos para encontros
          </p>
        </div>

        {form.eixos.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
            Nenhum eixo formativo adicionado.
          </p>
        ) : (
          <div className="space-y-3">
            {form.eixos.map((eixo, idx) => (
              <div key={eixo.id} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Eixo {idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeEixo(eixo.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Linha 1: Eixo Formativo + Etapa */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Eixo Formativo</Label>
                    <Input
                      className="h-8 text-xs"
                      value={eixo.nome}
                      onChange={(e) => updateEixo(eixo.id, "nome", e.target.value)}
                      placeholder="Ex.: Autoconhecimento e Maturidade Humana"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">
                      Etapa{" "}
                      <span className="font-normal text-muted-foreground">(nome amigável)</span>
                    </Label>
                    <Input
                      className="h-8 text-xs"
                      value={eixo.nomeEtapa ?? ""}
                      onChange={(e) => updateEixo(eixo.id, "nomeEtapa", e.target.value)}
                      placeholder="Ex.: Conhece-te"
                    />
                  </div>
                </div>

                {/* Objetivo */}
                <div className="grid gap-1">
                  <Label className="text-xs">Objetivo</Label>
                  <Textarea
                    className="min-h-12 text-xs resize-none"
                    value={eixo.objetivo}
                    onChange={(e) => updateEixo(eixo.id, "objetivo", e.target.value)}
                    placeholder="Objetivo do eixo formativo..."
                  />
                </div>

                {/* Linha 3: Intervalo + CH + Área */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">Intervalo de Encontros</Label>
                    <Input
                      className="h-8 text-xs"
                      value={eixo.intervaloEncontros}
                      onChange={(e) => updateEixo(eixo.id, "intervaloEncontros", e.target.value)}
                      placeholder="Ex.: Encontros 1–15"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Carga Horária (h)</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-xs"
                      value={String(eixo.cargaHoraria)}
                      onChange={(e) => updateEixo(eixo.id, "cargaHoraria", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-xs">Área de Formação</Label>
                    <Input
                      className="h-8 text-xs"
                      value={eixo.areaFormacao}
                      onChange={(e) => updateEixo(eixo.id, "areaFormacao", e.target.value)}
                      placeholder="Ex.: Humano"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {form.eixos.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-right">
            Carga horária total dos encontros:{" "}
            <span className="font-medium text-foreground">
              {form.eixos.reduce((s, e) => s + e.cargaHoraria, 0)}h
            </span>
          </p>
        )}
        <Button type="button" variant="outline" size="sm" onClick={addEixo} className="mt-3 h-7 text-xs w-full">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar eixo
        </Button>
      </div>

      {/* ── Seção 2: Retiros Comunitários ───────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Retiros Comunitários</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direcionamentos para retiros comunitários
          </p>
        </div>

        {retirosComunitarios.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
            Nenhum retiro comunitário adicionado.
          </p>
        ) : (
          <div className="space-y-3">
            {retirosComunitarios.map((retiro) => (
              <RetiroCard
                key={retiro.id}
                retiro={retiro}
                onRemove={() => removeRetiro(retiro.id)}
                onUpdate={(field, value) => updateRetiro(retiro.id, field, value)}
              />
            ))}
          </div>
        )}

        {retirosComunitarios.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-right">
            Carga horária total:{" "}
            <span className="font-medium text-foreground">
              {retirosComunitarios.reduce((s, r) => s + r.cargaHoraria, 0)}h
            </span>
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addRetiro("comunitario")}
          className="mt-3 h-7 text-xs w-full"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar retiro comunitário
        </Button>
      </div>

      {/* ── Seção 3: Retiros Pessoais ───────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Retiros Pessoais</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Direcionamentos para retiros pessoais
          </p>
        </div>

        {retirosPessoais.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
            Nenhum retiro pessoal adicionado.
          </p>
        ) : (
          <div className="space-y-3">
            {retirosPessoais.map((retiro) => (
              <RetiroCard
                key={retiro.id}
                retiro={retiro}
                onRemove={() => removeRetiro(retiro.id)}
                onUpdate={(field, value) => updateRetiro(retiro.id, field, value)}
              />
            ))}
          </div>
        )}

        {retirosPessoais.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-right">
            Carga horária total:{" "}
            <span className="font-medium text-foreground">
              {retirosPessoais.reduce((s, r) => s + r.cargaHoraria, 0)}h
            </span>
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addRetiro("pessoal")}
          className="mt-3 h-7 text-xs w-full"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Adicionar retiro pessoal
        </Button>
      </div>

      {/* ── Documento ───────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Documento do plano</h2>
        {form.documentoNome ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm truncate flex-1">{form.documentoNome}</span>
            {documentoFile && (
              <span className="text-xs text-amber-600 shrink-0">pendente de salvar</span>
            )}
            <button
              type="button"
              onClick={removerDocumento}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
            >
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

      {/* ── Ações ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-2 pb-6">
        <Button
          variant="outline"
          onClick={() => router.push(isEditing ? `/planos/${id}` : "/planos")}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</>
            : isEditing ? "Salvar alterações" : "Criar plano"
          }
        </Button>
      </div>
    </div>
  );
}

// ── Componente auxiliar: card de retiro ─────────────────────────────────────
function RetiroCard({
  retiro,
  onRemove,
  onUpdate,
}: {
  retiro: RetiroPlano;
  onRemove: () => void;
  onUpdate: (field: keyof RetiroPlano, value: string) => void;
}) {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          {retiro.numero}º Retiro {retiro.tipo === "comunitario" ? "Comunitário" : "Pessoal"}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tema + Trecho Bíblico */}
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Tema do Retiro</Label>
          <Input
            className="h-8 text-xs"
            value={retiro.tema}
            onChange={(e) => onUpdate("tema", e.target.value)}
            placeholder="Ex.: Firmes no Chamado"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Trecho Bíblico</Label>
          <Input
            className="h-8 text-xs"
            value={retiro.trechoBiblico ?? ""}
            onChange={(e) => onUpdate("trechoBiblico", e.target.value)}
            placeholder="Ex.: 1Cor 15,58"
          />
        </div>
      </div>

      {/* Objetivo */}
      <div className="grid gap-1">
        <Label className="text-xs">Objetivo</Label>
        <Textarea
          className="min-h-12 text-xs resize-none"
          value={retiro.objetivo}
          onChange={(e) => onUpdate("objetivo", e.target.value)}
          placeholder="Objetivo do retiro..."
        />
      </div>

      {/* Quando Realizar + CH */}
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label className="text-xs">Quando Realizar</Label>
          <Input
            className="h-8 text-xs"
            value={retiro.quandoRealizar}
            onChange={(e) => onUpdate("quandoRealizar", e.target.value)}
            placeholder="Ex.: Final do 1º ano"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Carga Horária (h)</Label>
          <Input
            type="number"
            min="1"
            className="h-8 text-xs"
            value={String(retiro.cargaHoraria)}
            onChange={(e) => onUpdate("cargaHoraria", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
