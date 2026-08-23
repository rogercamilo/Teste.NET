"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useEtapaLabels } from "@/lib/data-store";
import type { PlanoFormativo } from "@/types";
import {
  STATUS_PLANO_LABELS,
  NIVEIS_FORMATIVOS_SELECIONAVEIS,
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

const NIVEIS: NivelFormativo[] = NIVEIS_FORMATIVOS_SELECIONAVEIS;

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
    materialAnexo: "",
    materialAnexoId: "",
    materialFormandoAnexo: "",
    materialFormandoAnexoId: "",
  };
}

interface PlanoFormPageProps {
  id?: string;
  initialPlano?: PlanoFormativo;
}

export default function PlanoFormPage({ id, initialPlano }: PlanoFormPageProps) {
  const router = useRouter();
  const etapaLabels = useEtapaLabels();
  const isEditing = !!id;

  const [form, setForm] = useState<FormState>(() => {
    if (initialPlano) {
      return {
        nome: initialPlano.nome,
        objetivos: initialPlano.objetivos,
        fundamentacao: initialPlano.fundamentacao,
        nivelFormativo: initialPlano.nivelFormativo,
        status: initialPlano.status,
        eixos: initialPlano.eixos,
        retiros: initialPlano.retiros ?? [],
        documentoNome: initialPlano.documentoAnexo ?? "",
        documentoId: initialPlano.documentoAnexoId ?? "",
      };
    }
    return EMPTY_FORM;
  });
  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  // Arquivos pendentes por retiro (chave = retiro.id): material do formador e
  // material do formando (liberado por grupo depois).
  const [retiroFiles, setRetiroFiles] = useState<Record<string, File | null>>({});
  const [retiroFormandoFiles, setRetiroFormandoFiles] = useState<Record<string, File | null>>({});
  const [saving, setSaving] = useState(false);

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

  function selectRetiroMaterial(retiroId: string, file: File) {
    setRetiroFiles((prev) => ({ ...prev, [retiroId]: file }));
    setForm((prev) => ({
      ...prev,
      retiros: prev.retiros.map((r) =>
        r.id === retiroId ? { ...r, materialAnexo: file.name, materialAnexoId: "" } : r
      ),
    }));
    toast.success("Material selecionado. Será salvo ao confirmar.");
  }

  function removeRetiroMaterial(retiroId: string) {
    setRetiroFiles((prev) => ({ ...prev, [retiroId]: null }));
    setForm((prev) => ({
      ...prev,
      retiros: prev.retiros.map((r) =>
        r.id === retiroId ? { ...r, materialAnexo: "", materialAnexoId: "" } : r
      ),
    }));
  }

  function selectRetiroFormandoMaterial(retiroId: string, file: File) {
    setRetiroFormandoFiles((prev) => ({ ...prev, [retiroId]: file }));
    setForm((prev) => ({
      ...prev,
      retiros: prev.retiros.map((r) =>
        r.id === retiroId ? { ...r, materialFormandoAnexo: file.name, materialFormandoAnexoId: "" } : r
      ),
    }));
    toast.success("Material do formando selecionado. Será salvo ao confirmar.");
  }

  function removeRetiroFormandoMaterial(retiroId: string) {
    setRetiroFormandoFiles((prev) => ({ ...prev, [retiroId]: null }));
    setForm((prev) => ({
      ...prev,
      retiros: prev.retiros.map((r) =>
        r.id === retiroId ? { ...r, materialFormandoAnexo: "", materialFormandoAnexoId: "" } : r
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
      const JSON_H = { "Content-Type": "application/json" };
      const basePayload = {
        nome: form.nome.trim(),
        objetivos: form.objetivos.trim(),
        fundamentacao: form.fundamentacao.trim(),
        nivelFormativo: form.nivelFormativo,
        status: form.status,
        eixos: form.eixos,
        retiros: form.retiros,
      };

      // Envia o documento pendente do plano (se houver) e remove o antigo
      // substituído/limpo. Retorna o par {nome,id} final a persistir.
      const resolveDocumento = async (planoId: string): Promise<{ nome?: string; id?: string }> => {
        const originalId = initialPlano?.documentoAnexoId;
        if (documentoFile) {
          const fd = new FormData();
          fd.append("file", documentoFile);
          fd.append("entityType", "plano");
          fd.append("entityId", planoId);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (!uploadRes.ok) throw new Error(`Erro ao enviar documento: ${await uploadRes.text()}`);
          const uploaded = await uploadRes.json() as { id: string; nome: string };
          if (originalId) fetch(`/api/arquivos/${originalId}`, { method: "DELETE" }).catch(() => null);
          return { nome: uploaded.nome, id: uploaded.id };
        }
        if (!form.documentoNome && originalId) {
          fetch(`/api/arquivos/${originalId}`, { method: "DELETE" }).catch(() => null);
          return { nome: undefined, id: undefined };
        }
        return { nome: form.documentoNome || undefined, id: form.documentoId || undefined };
      };

      // Sobe um arquivo pendente (entityType "plano" é genérico — o vínculo real
      // é a FK no retiro), remove o antigo substituído/limpo e devolve {nome,id}.
      const resolveArquivo = async (
        planoId: string,
        pending: File | null,
        currentNome: string | undefined,
        currentId: string | undefined,
        originalId: string | undefined,
      ): Promise<{ nome?: string; id?: string }> => {
        if (pending) {
          const fd = new FormData();
          fd.append("file", pending);
          fd.append("entityType", "plano");
          fd.append("entityId", planoId);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (!uploadRes.ok) throw new Error(`Erro ao enviar material do retiro: ${await uploadRes.text()}`);
          const uploaded = await uploadRes.json() as { id: string; nome: string };
          if (originalId) fetch(`/api/arquivos/${originalId}`, { method: "DELETE" }).catch(() => null);
          return { nome: uploaded.nome, id: uploaded.id };
        }
        if (!currentNome && originalId) {
          fetch(`/api/arquivos/${originalId}`, { method: "DELETE" }).catch(() => null);
          return { nome: undefined, id: undefined };
        }
        return { nome: currentNome || undefined, id: currentId || undefined };
      };

      // Cada retiro carrega 2 anexos: material do formador (interno) e material
      // do formando (liberado por grupo depois). Ambos seguem a mesma lógica.
      const resolveRetiros = async (planoId: string): Promise<RetiroPlano[]> =>
        Promise.all(form.retiros.map(async (r) => {
          const original = initialPlano?.retiros?.find((o) => o.id === r.id);
          const formador = await resolveArquivo(planoId, retiroFiles[r.id] ?? null, r.materialAnexo, r.materialAnexoId, original?.materialAnexoId);
          const formando = await resolveArquivo(planoId, retiroFormandoFiles[r.id] ?? null, r.materialFormandoAnexo, r.materialFormandoAnexoId, original?.materialFormandoAnexoId);
          return {
            ...r,
            materialAnexo: formador.nome, materialAnexoId: formador.id,
            materialFormandoAnexo: formando.nome, materialFormandoAnexoId: formando.id,
          };
        }));

      // 1) Garante o plano com id real (cria no fluxo novo).
      let planoId = id ?? "";
      if (!isEditing) {
        const createRes = await fetch("/api/planos", { method: "POST", headers: JSON_H, body: JSON.stringify(basePayload) });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error || "Erro ao criar plano");
        }
        planoId = (await createRes.json() as { id: string }).id;
      }

      // 2) Resolve anexos (documento do plano + material por retiro).
      const documento = await resolveDocumento(planoId);
      const resolvedRetiros = await resolveRetiros(planoId);

      // 3) Retiros removidos que tinham material → apaga os arquivos órfãos no R2.
      const currentIds = new Set(form.retiros.map((r) => r.id));
      (initialPlano?.retiros ?? []).forEach((o) => {
        if (currentIds.has(o.id)) return;
        [o.materialAnexoId, o.materialFormandoAnexoId].forEach((aid) => {
          if (aid) fetch(`/api/arquivos/${aid}`, { method: "DELETE" }).catch(() => null);
        });
      });

      // 4) Persiste. No create sem anexos o plano já está completo (pula PUT).
      const hasRetiroFiles =
        Object.values(retiroFiles).some(Boolean) || Object.values(retiroFormandoFiles).some(Boolean);
      if (isEditing || documentoFile || hasRetiroFiles) {
        const res = await fetch(`/api/planos/${planoId}`, {
          method: "PUT",
          headers: JSON_H,
          body: JSON.stringify({
            ...basePayload,
            retiros: resolvedRetiros,
            documentoAnexo: documento.nome,
            documentoAnexoId: documento.id,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(err.error || (isEditing ? "Erro ao atualizar plano" : "Erro ao salvar anexos do plano"));
        }
      }

      toast.success(isEditing ? "Plano atualizado com sucesso!" : "Plano criado com sucesso!");
      router.push(isEditing ? `/planos/${planoId}` : "/planos");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha de rede. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

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
              <Select value={form.nivelFormativo} onValueChange={(v) => v && set("nivelFormativo")(v)} items={etapaLabels}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NIVEIS.map((n) => (
                    <SelectItem key={n} value={n}>{etapaLabels[n]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => v && set("status")(v)} items={STATUS_PLANO_LABELS}>
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
                pendingMaterial={retiroFiles[retiro.id] ?? null}
                onSelectMaterial={(file) => selectRetiroMaterial(retiro.id, file)}
                onRemoveMaterial={() => removeRetiroMaterial(retiro.id)}
                pendingFormandoMaterial={retiroFormandoFiles[retiro.id] ?? null}
                onSelectFormandoMaterial={(file) => selectRetiroFormandoMaterial(retiro.id, file)}
                onRemoveFormandoMaterial={() => removeRetiroFormandoMaterial(retiro.id)}
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
                pendingMaterial={retiroFiles[retiro.id] ?? null}
                onSelectMaterial={(file) => selectRetiroMaterial(retiro.id, file)}
                onRemoveMaterial={() => removeRetiroMaterial(retiro.id)}
                pendingFormandoMaterial={retiroFormandoFiles[retiro.id] ?? null}
                onSelectFormandoMaterial={(file) => selectRetiroFormandoMaterial(retiro.id, file)}
                onRemoveFormandoMaterial={() => removeRetiroFormandoMaterial(retiro.id)}
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
  pendingMaterial,
  onSelectMaterial,
  onRemoveMaterial,
  pendingFormandoMaterial,
  onSelectFormandoMaterial,
  onRemoveFormandoMaterial,
}: {
  retiro: RetiroPlano;
  onRemove: () => void;
  onUpdate: (field: keyof RetiroPlano, value: string) => void;
  pendingMaterial: File | null;
  onSelectMaterial: (file: File) => void;
  onRemoveMaterial: () => void;
  pendingFormandoMaterial: File | null;
  onSelectFormandoMaterial: (file: File) => void;
  onRemoveFormandoMaterial: () => void;
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

      {/* Materiais de direcionamento — só para retiros comunitários */}
      {retiro.tipo === "comunitario" && (
        <div className="space-y-2 pt-1">
          <RetiroMaterialField
            label="Material de direcionamento para retiro comunitário"
            hint="Uso do formador — fica disponível na grade. Não é exibido ao formando."
            nome={retiro.materialAnexo}
            pending={pendingMaterial}
            onSelect={onSelectMaterial}
            onRemove={onRemoveMaterial}
          />
          <RetiroMaterialField
            label="Material de direcionamento para o formando"
            hint="Fica no portal do formando quando um formador liberar (por grupo). Antes disso, só o formador vê."
            nome={retiro.materialFormandoAnexo}
            pending={pendingFormandoMaterial}
            onSelect={onSelectFormandoMaterial}
            onRemove={onRemoveFormandoMaterial}
          />
        </div>
      )}
    </div>
  );
}

// ── Campo de upload de material do retiro (formador ou formando) ─────────────
function RetiroMaterialField({
  label,
  hint,
  nome,
  pending,
  onSelect,
  onRemove,
}: {
  label: string;
  hint: string;
  nome?: string;
  pending: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <p className="text-[11px] text-muted-foreground -mt-0.5">{hint}</p>
      {nome ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs truncate flex-1">{nome}</span>
          {pending && <span className="text-[11px] text-amber-600 shrink-0">pendente de salvar</span>}
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-card cursor-pointer hover:bg-muted/40 transition-colors">
          <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Selecionar PDF ou Word (.pdf, .docx, .doc)</span>
          <input
            type="file"
            accept=".pdf,.docx,.doc"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSelect(file);
            }}
          />
        </label>
      )}
    </div>
  );
}
