"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useEtapaLabels } from "@/lib/data-store";
import {
  MODALIDADE_LABELS,
  isAdmin,
  type NivelFormativo,
  type GradeFormativa,
  type Eixo,
  type EixoPlano,
  type Formacao,
  type PlanoFormativo,
  type Usuario,
  type Modalidade,
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
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Paperclip,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

const EIXO_HEX = ["#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

type FormState = {
  nome: string;
  planoId: string;
  nivelFormativo: NivelFormativo;
  vigenciaInicio: string;
  vigenciaFim: string;
  versao: string;
  eixos: string;
  objetivos: string;
  fundamentacao: string;
  documentoNome: string;
  documentoId: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  planoId: "",
  nivelFormativo: "pre-discipulado",
  vigenciaInicio: "",
  vigenciaFim: "",
  versao: "1.0",
  eixos: "",
  objetivos: "",
  fundamentacao: "",
  documentoNome: "",
  documentoId: "",
};

type FormacaoInput = {
  tempId: string;
  tema: string;
  objetivo: string;
  descricao: string;
  formadorId: string;
  cargaHoraria: string;
  modalidade: Modalidade;
  observacoesFormador: string;
};

type EixoComFormacoes = {
  eixoPlano: EixoPlano;
  formacoes: FormacaoInput[];
  expanded: boolean;
};

function parseEixos(raw: string, gradeId: string): Eixo[] {
  return raw
    .split(";")
    .map((n) => n.trim())
    .filter(Boolean)
    .map((nome, i) => ({
      id: `e${Date.now()}-${i}`,
      nome,
      descricao: "",
      gradeId,
      ordem: i + 1,
      cor: EIXO_HEX[i % EIXO_HEX.length],
    }));
}

function emptyFormacao(): FormacaoInput {
  return {
    tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    tema: "",
    objetivo: "",
    descricao: "",
    formadorId: "",
    cargaHoraria: "2",
    modalidade: "presencial",
    observacoesFormador: "",
  };
}

interface GradeFormPageProps {
  id?: string;
  role: string;
  initialGrade?: GradeFormativa;
  initialFormacoes?: Formacao[];
  initialPlanos?: PlanoFormativo[];
  initialUsuarios?: Usuario[];
}

export default function GradeFormPage({
  id,
  role,
  initialGrade,
  initialFormacoes = [],
  initialPlanos = [],
  initialUsuarios = [],
}: GradeFormPageProps) {
  const router = useRouter();
  const canManageFormacoes = isAdmin(role);

  const etapaLabels = useEtapaLabels();
  const isEditing = !!id;

  const [form, setForm] = useState<FormState>(() => {
    const g = initialGrade;
    if (g) {
      return {
        nome: g.nome,
        planoId: g.planoId,
        nivelFormativo: g.nivelFormativo,
        vigenciaInicio: g.vigenciaInicio,
        vigenciaFim: g.vigenciaFim,
        versao: g.versao,
        eixos: g.eixos.map((e) => e.nome).join("; "),
        objetivos: g.objetivos ?? "",
        fundamentacao: g.fundamentacao ?? "",
        documentoNome: g.documentoAnexo ?? "",
        documentoId: g.documentoAnexoId ?? "",
      };
    }
    return EMPTY_FORM;
  });

  const [eixosComFormacoes, setEixosComFormacoes] = useState<EixoComFormacoes[]>(() => {
    const g = initialGrade;
    if (!g || !canManageFormacoes) return [];
    const plano = initialPlanos.find((p) => p.id === g.planoId);
    if (!plano || plano.eixos.length === 0) return [];
    const existingFormacoes = initialFormacoes.filter((f) => f.gradeId === id);
    return plano.eixos.map((ep) => ({
      eixoPlano: ep,
      formacoes: existingFormacoes
        .filter((f) => f.eixoNome === ep.nome)
        .sort((a, b) => (a.numero ?? 999) - (b.numero ?? 999))
        .map((f) => ({
          tempId: f.id,
          tema: f.tema,
          objetivo: f.objetivo,
          descricao: f.descricao,
          formadorId: f.formadorId,
          cargaHoraria: String(f.cargaHoraria),
          modalidade: f.modalidade,
          observacoesFormador: f.observacoesFormador ?? "",
        })),
      expanded: true,
    }));
  });

  const [documentoFile, setDocumentoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handlePlanoChange(planoId: string | null) {
    if (!planoId) return;
    const plano = initialPlanos.find((p) => p.id === planoId);
    setForm((prev) => ({
      ...prev,
      planoId,
      nivelFormativo: plano?.nivelFormativo ?? prev.nivelFormativo,
    }));
    if (canManageFormacoes && plano && plano.eixos.length > 0) {
      setEixosComFormacoes(
        plano.eixos.map((ep) => ({
          eixoPlano: ep,
          formacoes: [],
          expanded: true,
        }))
      );
    } else {
      setEixosComFormacoes([]);
    }
  }

  function toggleEixo(idx: number) {
    setEixosComFormacoes((prev) =>
      prev.map((ec, i) => (i === idx ? { ...ec, expanded: !ec.expanded } : ec))
    );
  }

  function addFormacao(eixoIdx: number) {
    setEixosComFormacoes((prev) =>
      prev.map((ec, i) =>
        i === eixoIdx ? { ...ec, formacoes: [...ec.formacoes, emptyFormacao()] } : ec
      )
    );
  }

  function removeFormacao(eixoIdx: number, tempId: string) {
    setEixosComFormacoes((prev) =>
      prev.map((ec, i) =>
        i === eixoIdx
          ? { ...ec, formacoes: ec.formacoes.filter((f) => f.tempId !== tempId) }
          : ec
      )
    );
  }

  function updateFormacao(
    eixoIdx: number,
    tempId: string,
    field: keyof FormacaoInput,
    value: string
  ) {
    setEixosComFormacoes((prev) =>
      prev.map((ec, i) =>
        i === eixoIdx
          ? {
              ...ec,
              formacoes: ec.formacoes.map((f) =>
                f.tempId === tempId ? { ...f, [field]: value } : f
              ),
            }
          : ec
      )
    );
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
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (!form.planoId) return toast.error("Selecione o plano formativo.");
    if (!form.vigenciaInicio || !form.vigenciaFim)
      return toast.error("Datas de vigência são obrigatórias.");
    setSaving(true);
    const JSON_H = { "Content-Type": "application/json" };
    try {
      const plano = initialPlanos.find((p) => p.id === form.planoId);
      const nivelFormativo = plano?.nivelFormativo ?? form.nivelFormativo;

      const eixosPayload = eixosComFormacoes.length > 0
        ? eixosComFormacoes.map((ec, idx) => ({
            id: `e-${idx}`,
            nome: ec.eixoPlano.nome,
            descricao: ec.eixoPlano.objetivo ?? "",
            ordem: idx + 1,
            cor: EIXO_HEX[idx % EIXO_HEX.length],
            eixoPlanoId: ec.eixoPlano.id,
          }))
        : form.eixos.split(";").map((n) => n.trim()).filter(Boolean).map((nome, i) => ({
            id: `e-${i}`,
            nome,
            descricao: "",
            ordem: i + 1,
            cor: EIXO_HEX[i % EIXO_HEX.length],
          }));

      const basePayload = {
        nome: form.nome.trim(),
        planoId: form.planoId,
        planoNome: plano?.nome ?? "",
        nivelFormativo,
        vigenciaInicio: form.vigenciaInicio,
        vigenciaFim: form.vigenciaFim,
        versao: form.versao || "1.0",
        totalFormacoes: eixosComFormacoes.reduce((s, ec) => s + ec.formacoes.length, 0),
        objetivos: form.objetivos.trim() || undefined,
        fundamentacao: form.fundamentacao.trim() || undefined,
        ativo: true,
        eixos: eixosPayload,
      };

      // Cria formações vinculadas à grade com IDs reais
      async function criarFormacoes(gradeId: string, gradeEixos: Array<{ id: string; eixoPlanoId?: string }>) {
        const eixoMap = new Map(gradeEixos.map((e) => [e.eixoPlanoId, e.id]));
        let seq = 0;
        const results = await Promise.all(
          eixosComFormacoes.flatMap((ec) =>
            ec.formacoes.map(async (f) => {
              seq++;
              const res = await fetch("/api/formacoes", {
                method: "POST",
                headers: JSON_H,
                body: JSON.stringify({
                  tema: f.tema.trim(),
                  objetivo: f.objetivo.trim() || undefined,
                  descricao: f.descricao.trim() || undefined,
                  nivelFormativo,
                  eixoId: eixoMap.get(ec.eixoPlano.id) || undefined,
                  eixoNome: ec.eixoPlano.nome,
                  formadorId: f.formadorId || undefined,
                  formadorNome: initialUsuarios.find((u) => u.id === f.formadorId)?.nome ?? "",
                  cargaHoraria: Number(f.cargaHoraria) || 2,
                  modalidade: f.modalidade,
                  tipoFormacao: "comunitaria",
                  gradeId,
                  gradeNome: form.nome.trim(),
                  numero: seq,
                  observacoesFormador: f.observacoesFormador.trim() || undefined,
                }),
              });
              return res.ok ? res.json() : null;
            })
          )
        );
        return results.filter(Boolean);
      }

      if (isEditing && id) {
        // ── EDIÇÃO ──────────────────────────────────────────────────────
        const existing = initialGrade;
        let documentoAnexo = form.documentoNome || undefined;
        let documentoAnexoId = form.documentoId || undefined;

        if (documentoFile) {
          const fd = new FormData();
          fd.append("file", documentoFile);
          fd.append("entityType", "grade");
          fd.append("entityId", id);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (!uploadRes.ok) {
            toast.error(`Erro ao enviar documento: ${await uploadRes.text()}`);
            return;
          }
          const uploaded = await uploadRes.json() as { id: string; nome: string };
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

        const putRes = await fetch(`/api/grades/${id}`, {
          method: "PUT",
          headers: JSON_H,
          body: JSON.stringify({ ...basePayload, documentoAnexo, documentoAnexoId }),
        });
        if (!putRes.ok) {
          const err = await putRes.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || "Erro ao atualizar grade");
          return;
        }
        const updated = await putRes.json();

        if (canManageFormacoes && eixosComFormacoes.length > 0) {
          // Remove formações antigas e recria com IDs reais
          const existingForms = initialFormacoes.filter((f) => f.gradeId === id);
          await Promise.all(
            existingForms.map((f) =>
              fetch(`/api/formacoes/${f.id}`, { method: "DELETE" }).catch(() => null)
            )
          );
          const novas = await criarFormacoes(id, updated.eixos);
          void novas;
        }

        toast.success("Grade atualizada com sucesso!");
        router.push(`/grades/${id}`);
        router.refresh();
      } else {
        // ── CRIAÇÃO ─────────────────────────────────────────────────────
        const createRes = await fetch("/api/grades", {
          method: "POST",
          headers: JSON_H,
          body: JSON.stringify(basePayload),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || "Erro ao criar grade");
          return;
        }
        let created = await createRes.json();

        if (canManageFormacoes && eixosComFormacoes.length > 0) {
          const novas = await criarFormacoes(created.id, created.eixos);
          void novas;
        }

        if (documentoFile) {
          const fd = new FormData();
          fd.append("file", documentoFile);
          fd.append("entityType", "grade");
          fd.append("entityId", created.id);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (uploadRes.ok) {
            const uploaded = await uploadRes.json() as { id: string; nome: string };
            const updateRes = await fetch(`/api/grades/${created.id}`, {
              method: "PUT",
              headers: JSON_H,
              body: JSON.stringify({ ...basePayload, documentoAnexo: uploaded.nome, documentoAnexoId: uploaded.id }),
            });
            if (updateRes.ok) created = await updateRes.json();
          } else {
            toast.warning("Grade criada, mas o documento não pôde ser anexado.");
          }
        }

        toast.success("Grade criada com sucesso!");
        router.push("/grades");
        router.refresh();
      }
    } catch {
      toast.error("Falha de rede. Verifique sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const totalFormacoesCadastradas = eixosComFormacoes.reduce(
    (s, ec) => s + ec.formacoes.length,
    0
  );

  return (
    <div className="max-w-2xl space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(isEditing ? `/grades/${id}` : "/grades")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* ── Dados da grade ── */}
      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-foreground mb-6">
          {isEditing ? "Editar Grade Formativa" : "Nova Grade Formativa"}
        </h1>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>
              Nome <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.nome}
              onChange={(e) => set("nome")(e.target.value)}
              placeholder="Grade Pré-Discipulado 2025"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Plano Formativo</Label>
            <Select value={form.planoId} onValueChange={handlePlanoChange} items={Object.fromEntries(initialPlanos.map((p) => [p.id, `${p.nome} (${etapaLabels[p.nivelFormativo]})`]))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano..." />
              </SelectTrigger>
              <SelectContent>
                {initialPlanos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span>{p.nome}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({etapaLabels[p.nivelFormativo]})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>
              Etapa Formativa <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.nivelFormativo}
              onValueChange={(v) => v && set("nivelFormativo")(v)}
              disabled={!!form.planoId}
              items={etapaLabels}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  [
                    "pre-discipulado",
                    "discipulado",
                    "primeiras-promessas",
                    "formacao-permanente",
                  ] as NivelFormativo[]
                ).map((n) => (
                  <SelectItem key={n} value={n}>
                    {etapaLabels[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.planoId && (
              <p className="text-xs text-muted-foreground">
                Definida automaticamente pelo plano selecionado.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>
                Vigência início <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.vigenciaInicio}
                onChange={(e) => set("vigenciaInicio")(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                Vigência fim <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={form.vigenciaFim}
                onChange={(e) => set("vigenciaFim")(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Versão</Label>
            <Input
              value={form.versao}
              onChange={(e) => set("versao")(e.target.value)}
              placeholder="1.0"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Objetivos</Label>
            <Textarea
              value={form.objetivos}
              onChange={(e) => set("objetivos")(e.target.value)}
              placeholder="Descreva os objetivos desta grade formativa..."
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

          {/* Campo de eixos manual — apenas quando o plano não fornece eixos */}
          {eixosComFormacoes.length === 0 && (
            <div className="grid gap-1.5">
              <Label>Eixos Pedagógicos</Label>
              <Input
                value={form.eixos}
                onChange={(e) => set("eixos")(e.target.value)}
                placeholder="Identidade; Oração; Comunidade; Missão"
              />
              <p className="text-xs text-muted-foreground">
                Separe os eixos com ponto e vírgula (;)
              </p>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>Documento da grade</Label>
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
                <span className="text-sm text-muted-foreground">
                  Selecionar PDF ou Word (.pdf, .docx, .doc)
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={handleDocumentoInput}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ── Eixos e Formações (card separado) ── */}
      {canManageFormacoes && eixosComFormacoes.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-4">
          <div>
            <p className="text-base font-semibold text-foreground">Eixos Formativos e Formações</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {eixosComFormacoes.length} eixos · {totalFormacoesCadastradas} formação
              {totalFormacoesCadastradas !== 1 ? "ões" : ""} cadastrada
              {totalFormacoesCadastradas !== 1 ? "s" : ""}
            </p>
          </div>

          {eixosComFormacoes.map((ec, eixoIdx) => (
            <div key={ec.eixoPlano.id} className="rounded-xl border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => toggleEixo(eixoIdx)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: EIXO_HEX[eixoIdx % EIXO_HEX.length] }}
                  />
                  <span className="text-sm font-medium text-foreground truncate">
                    {ec.eixoPlano.nomeEtapa ?? ec.eixoPlano.nome}
                  </span>
                  {ec.eixoPlano.nomeEtapa && ec.eixoPlano.nome !== ec.eixoPlano.nomeEtapa && (
                    <span className="text-xs text-muted-foreground hidden sm:block truncate">
                      {ec.eixoPlano.nome}
                    </span>
                  )}
                  {!ec.eixoPlano.nomeEtapa && ec.eixoPlano.objetivo && (
                    <span className="text-xs text-muted-foreground hidden sm:block truncate">
                      — {ec.eixoPlano.objetivo}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs text-muted-foreground">
                    {ec.formacoes.length} formação{ec.formacoes.length !== 1 ? "ões" : ""}
                  </span>
                  {ec.expanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {ec.expanded && (
                <div className="p-4 space-y-3 bg-muted/10">
                  {ec.formacoes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      Nenhuma formação cadastrada para este eixo.
                    </p>
                  )}

                  {ec.formacoes.map((formacao, fIdx) => {
                    const globalNum =
                      eixosComFormacoes
                        .slice(0, eixoIdx)
                        .reduce((s, e) => s + e.formacoes.length, 0) +
                      fIdx +
                      1;
                    return (
                    <div
                      key={formacao.tempId}
                      className="rounded-lg border border-border/60 bg-card p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            #{globalNum}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {ec.eixoPlano.nomeEtapa ?? ec.eixoPlano.nome}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFormacao(eixoIdx, formacao.tempId)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid gap-3">
                        <div className="grid gap-1.5">
                          <Label className="text-xs">
                            Tema <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            value={formacao.tema}
                            onChange={(e) =>
                              updateFormacao(eixoIdx, formacao.tempId, "tema", e.target.value)
                            }
                            placeholder="Tema da formação"
                            className="h-9 text-sm"
                          />
                        </div>

                        <div className="grid gap-1.5">
                          <Label className="text-xs">Objetivo resumido</Label>
                          <Textarea
                            value={formacao.objetivo}
                            onChange={(e) =>
                              updateFormacao(eixoIdx, formacao.tempId, "objetivo", e.target.value)
                            }
                            placeholder="Objetivo desta formação..."
                            className="min-h-[60px] text-sm resize-none"
                          />
                        </div>

                        <div className="grid gap-1.5">
                          <Label className="text-xs">Observações do formador</Label>
                          <Textarea
                            value={formacao.observacoesFormador}
                            onChange={(e) =>
                              updateFormacao(eixoIdx, formacao.tempId, "observacoesFormador", e.target.value)
                            }
                            placeholder="Observações, contexto ou instruções para o formador..."
                            className="min-h-[56px] text-sm resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="grid gap-1.5">
                            <Label className="text-xs">Carga (h)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={formacao.cargaHoraria}
                              onChange={(e) =>
                                updateFormacao(
                                  eixoIdx,
                                  formacao.tempId,
                                  "cargaHoraria",
                                  e.target.value
                                )
                              }
                              className="h-9 text-sm"
                            />
                          </div>

                          <div className="grid gap-1.5">
                            <Label className="text-xs">Modalidade</Label>
                            <Select
                              value={formacao.modalidade}
                              onValueChange={(v) =>
                                v && updateFormacao(eixoIdx, formacao.tempId, "modalidade", v)
                              }
                              items={MODALIDADE_LABELS}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="presencial">Presencial</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="hibrida">Híbrida</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid gap-1.5">
                            <Label className="text-xs">Formador</Label>
                            <Select
                              value={formacao.formadorId}
                              onValueChange={(v) =>
                                v && updateFormacao(eixoIdx, formacao.tempId, "formadorId", v)
                              }
                              items={Object.fromEntries(initialUsuarios.filter((u) => u.ativo).map((u) => [u.id, u.nome]))}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Selecionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {initialUsuarios
                                  .filter((u) => u.ativo)
                                  .map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.nome}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addFormacao(eixoIdx)}
                    className="w-full h-9 gap-1.5 text-xs border-dashed"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar formação ao eixo
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Ações ── */}
      <div className="flex items-center justify-end gap-2 pb-4">
        <Button
          variant="outline"
          onClick={() => router.push(isEditing ? `/grades/${id}` : "/grades")}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando…</> : isEditing ? "Salvar alterações" : "Criar grade"}
        </Button>
      </div>
    </div>
  );
}
