"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useEtapaLabels } from "@/lib/data-store";
import {
  MODALIDADE_LABELS,
  NIVEIS_FORMATIVOS_SELECIONAVEIS,
  isGestao,
  type NivelFormativo,
  type GradeFormativa,
  type EixoPlano,
  type Formacao,
  type PlanoFormativo,
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
  Info,
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
  objetivos: "",
  fundamentacao: "",
  documentoNome: "",
  documentoId: "",
};

type FormacaoInput = {
  tempId: string; // chave estável de UI
  id?: string; // id real da formação (existente) — ausente em formações novas
  tema: string;
  objetivo: string;
  descricao: string;
  cargaHoraria: string;
  modalidade: Modalidade;
  observacoesFormador: string;
};

// Um grupo de formações. `eixoPlano` vem SEMPRE do plano formativo (a grade
// nunca cria eixos). `eixoPlano: null` = bucket de formações avulsas (grade sem
// eixos) ou órfãs (formações de um eixo que o plano deixou de ter) — sempre
// visível e sempre enviado, para nada sumir em silêncio.
type Grupo = {
  eixoPlano: EixoPlano | null;
  formacoes: FormacaoInput[];
  expanded: boolean;
};

function emptyFormacao(): FormacaoInput {
  return {
    tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    tema: "",
    objetivo: "",
    descricao: "",
    cargaHoraria: "2",
    modalidade: "presencial",
    observacoesFormador: "",
  };
}

function formacaoToInput(f: Formacao): FormacaoInput {
  return {
    tempId: f.id,
    id: f.id,
    tema: f.tema,
    objetivo: f.objetivo,
    descricao: f.descricao,
    cargaHoraria: String(f.cargaHoraria),
    modalidade: f.modalidade,
    observacoesFormador: f.observacoesFormador ?? "",
  };
}

/**
 * Monta os grupos da tela a partir do plano (fonte dos eixos) e das formações
 * existentes, ancorando cada formação ao eixo do plano por `eixoPlanoId`
 * (derivado do `eixoId` via os eixos da grade) — nunca por nome. Formações sem
 * eixo resolvível caem no bucket de avulsas/órfãs.
 */
function buildGrupos(
  plano: PlanoFormativo | undefined,
  grade: GradeFormativa | undefined,
  existentes: Formacao[],
): Grupo[] {
  const eixosPlano = plano?.eixos ?? [];

  // eixoId (da grade) → eixoPlanoId (do plano)
  const eixoIdToPlanoId = new Map(
    (grade?.eixos ?? []).map((e) => [e.id, e.eixoPlanoId]),
  );
  const planoIds = new Set(eixosPlano.map((e) => e.id));

  const porPlano = new Map<string, FormacaoInput[]>();
  const avulsas: FormacaoInput[] = [];
  for (const f of existentes) {
    const epId = f.eixoId ? eixoIdToPlanoId.get(f.eixoId) : undefined;
    if (epId && planoIds.has(epId)) {
      const arr = porPlano.get(epId) ?? [];
      arr.push(formacaoToInput(f));
      porPlano.set(epId, arr);
    } else {
      avulsas.push(formacaoToInput(f));
    }
  }

  const grupos: Grupo[] = eixosPlano.map((ep) => ({
    eixoPlano: ep,
    formacoes: porPlano.get(ep.id) ?? [],
    expanded: true,
  }));

  // Bucket de avulsas/órfãs: sempre presente quando o plano não tem eixos
  // (grade "solta"), ou quando há formações órfãs a preservar.
  if (eixosPlano.length === 0 || avulsas.length > 0) {
    grupos.push({ eixoPlano: null, formacoes: avulsas, expanded: true });
  }
  return grupos;
}

interface GradeFormPageProps {
  id?: string;
  role: string;
  initialGrade?: GradeFormativa;
  initialFormacoes?: Formacao[];
  initialPlanos?: PlanoFormativo[];
}

export default function GradeFormPage({
  id,
  role,
  initialGrade,
  initialFormacoes = [],
  initialPlanos = [],
}: GradeFormPageProps) {
  const router = useRouter();
  const canManageFormacoes = isGestao(role);

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
        objetivos: g.objetivos ?? "",
        fundamentacao: g.fundamentacao ?? "",
        documentoNome: g.documentoAnexo ?? "",
        documentoId: g.documentoAnexoId ?? "",
      };
    }
    return EMPTY_FORM;
  });

  const [grupos, setGrupos] = useState<Grupo[]>(() => {
    const g = initialGrade;
    if (!g || !canManageFormacoes) return [];
    const plano = initialPlanos.find((p) => p.id === g.planoId);
    const existentes = initialFormacoes.filter((f) => f.gradeId === id);
    return buildGrupos(plano, g, existentes);
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
    if (!canManageFormacoes || !plano) {
      setGrupos([]);
      return;
    }
    // Ao trocar de plano, os grupos são remontados a partir dos eixos do NOVO
    // plano. Formações já digitadas NÃO são descartadas: como os eixos do novo
    // plano não têm correspondência com o anterior, elas vão para o bucket de
    // avulsas (preservadas, com seu id) para o usuário refiliá-las.
    setGrupos((prev) => {
      const existentes = prev.flatMap((g) => g.formacoes);
      const novos: Grupo[] = (plano.eixos ?? []).map((ep) => ({
        eixoPlano: ep,
        formacoes: [],
        expanded: true,
      }));
      if ((plano.eixos ?? []).length === 0 || existentes.length > 0) {
        novos.push({ eixoPlano: null, formacoes: existentes, expanded: true });
      }
      return novos;
    });
  }

  function toggleGrupo(idx: number) {
    setGrupos((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, expanded: !g.expanded } : g)),
    );
  }

  function addFormacao(grupoIdx: number) {
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === grupoIdx ? { ...g, formacoes: [...g.formacoes, emptyFormacao()] } : g,
      ),
    );
  }

  function removeFormacao(grupoIdx: number, tempId: string) {
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === grupoIdx
          ? { ...g, formacoes: g.formacoes.filter((f) => f.tempId !== tempId) }
          : g,
      ),
    );
  }

  function updateFormacao(
    grupoIdx: number,
    tempId: string,
    field: keyof FormacaoInput,
    value: string,
  ) {
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === grupoIdx
          ? {
              ...g,
              formacoes: g.formacoes.map((f) =>
                f.tempId === tempId ? { ...f, [field]: value } : f,
              ),
            }
          : g,
      ),
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
    const formacoesFlat = grupos.flatMap((g) => g.formacoes);
    if (formacoesFlat.some((f) => !f.tema.trim()))
      return toast.error(
        "Toda formação precisa de um tema. Preencha ou remova as formações em branco antes de salvar.",
      );
    setSaving(true);
    const JSON_H = { "Content-Type": "application/json" };
    try {
      const plano = initialPlanos.find((p) => p.id === form.planoId);
      const nivelFormativo = plano?.nivelFormativo ?? form.nivelFormativo;

      // Formações enviadas EM LOTE junto da grade. Cada uma carrega seu `id`
      // (quando existente) e o `eixoPlanoId` do grupo — o servidor reconcilia
      // pelo id e resolve o eixo real a partir do plano. Eixos NÃO são enviados:
      // são projeção estável do plano, sincronizada no servidor.
      const managesFormacoes = canManageFormacoes && !!form.planoId;
      const formacoesField = managesFormacoes
        ? {
            formacoes: grupos.flatMap((g) =>
              g.formacoes.map((f) => ({
                id: f.id,
                eixoPlanoId: g.eixoPlano?.id ?? null,
                eixoNome: g.eixoPlano?.nome ?? null,
                tema: f.tema.trim(),
                objetivo: f.objetivo.trim() || undefined,
                descricao: f.descricao.trim() || undefined,
                cargaHoraria: Number(f.cargaHoraria) || 2,
                modalidade: f.modalidade,
                observacoesFormador: f.observacoesFormador.trim() || undefined,
              })),
            ),
          }
        : {};

      const basePayload = {
        nome: form.nome.trim(),
        planoId: form.planoId,
        planoNome: plano?.nome ?? "",
        nivelFormativo,
        vigenciaInicio: form.vigenciaInicio,
        vigenciaFim: form.vigenciaFim,
        versao: form.versao || "1.0",
        totalFormacoes: formacoesFlat.length,
        objetivos: form.objetivos.trim() || undefined,
        fundamentacao: form.fundamentacao.trim() || undefined,
        ativo: true,
      };

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
          const uploaded = (await uploadRes.json()) as { id: string; nome: string };
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
          body: JSON.stringify({ ...basePayload, ...formacoesField, documentoAnexo, documentoAnexoId }),
        });
        if (!putRes.ok) {
          const err = await putRes.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || "Erro ao atualizar grade");
          return;
        }

        toast.success("Grade atualizada com sucesso!");
        router.push(`/grades/${id}`);
        router.refresh();
      } else {
        // ── CRIAÇÃO ─────────────────────────────────────────────────────
        const createRes = await fetch("/api/grades", {
          method: "POST",
          headers: JSON_H,
          body: JSON.stringify({ ...basePayload, ...formacoesField }),
        });
        if (!createRes.ok) {
          const err = await createRes.json().catch(() => ({}));
          toast.error((err as { error?: string }).error || "Erro ao criar grade");
          return;
        }
        let created = await createRes.json();

        // O documento é anexado num PUT de acompanhamento SEM reenviar
        // `formacoes` (elas já foram persistidas no POST), evitando reconciliar
        // à toa.
        if (documentoFile) {
          const fd = new FormData();
          fd.append("file", documentoFile);
          fd.append("entityType", "grade");
          fd.append("entityId", created.id);
          const uploadRes = await fetch("/api/arquivos", { method: "POST", body: fd });
          if (uploadRes.ok) {
            const uploaded = (await uploadRes.json()) as { id: string; nome: string };
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

  const totalFormacoesCadastradas = grupos.reduce((s, g) => s + g.formacoes.length, 0);
  const planoTemEixos = grupos.some((g) => g.eixoPlano !== null);

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push(isEditing ? `/grades/${id}` : "/grades")}
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* ── Nota: objetivo e ganho da grade para o formador ─────────────── */}
      <div className="flex gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Por que montar a grade formativa?
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A grade traduz um plano formativo em formações concretas — os encontros que
            serão de fato conduzidos na etapa. Você parte dos eixos já definidos no
            plano e, dentro de cada um, cadastra as formações com tema, objetivo, carga
            horária e observações. O ganho para o formador: um roteiro operacional
            pronto, que evita improviso, alimenta a agenda e o diário, e preserva o
            trabalho entre versões (o que foi construído não se perde na próxima edição).
          </p>
        </div>
      </div>

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
            <p className="text-xs text-muted-foreground">
              Os eixos formativos vêm do plano selecionado — cadastre-os no plano.
              Aqui você apenas indica as formações da grade.
            </p>
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
                {NIVEIS_FORMATIVOS_SELECIONAVEIS.map((n) => (
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

      {/* ── Formações da grade (card separado) ── */}
      {canManageFormacoes && !form.planoId && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6">
          <p className="text-sm text-muted-foreground text-center">
            Selecione um plano formativo para indicar as formações da grade.
          </p>
        </div>
      )}

      {canManageFormacoes && grupos.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-4">
          <div>
            <p className="text-base font-semibold text-foreground">
              {planoTemEixos ? "Eixos Formativos e Formações" : "Formações da grade"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {planoTemEixos && `${grupos.filter((g) => g.eixoPlano).length} eixos · `}
              {totalFormacoesCadastradas} formação
              {totalFormacoesCadastradas !== 1 ? "ões" : ""} cadastrada
              {totalFormacoesCadastradas !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground/90 mt-1.5 leading-relaxed">
              Cadastre aqui os encontros de cada eixo — esta é a sequência que o
              formador vai conduzir na etapa. Quanto mais completos o tema, o objetivo
              e as observações, mais pronto o encontro chega na hora de aplicar. Os
              eixos vêm do plano; aqui você só distribui as formações dentro deles.
            </p>
          </div>

          {grupos.map((grupo, grupoIdx) => {
            const ep = grupo.eixoPlano;
            const titulo = ep
              ? ep.nomeEtapa ?? ep.nome
              : planoTemEixos
                ? "Formações avulsas (sem eixo)"
                : "Formações";
            return (
              <div
                key={ep?.id ?? "__avulsas__"}
                className="rounded-xl border border-border overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleGrupo(grupoIdx)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: ep ? EIXO_HEX[grupoIdx % EIXO_HEX.length] : "#9CA3AF" }}
                    />
                    <span className="text-sm font-medium text-foreground truncate">{titulo}</span>
                    {ep && ep.nomeEtapa && ep.nome !== ep.nomeEtapa && (
                      <span className="text-xs text-muted-foreground hidden sm:block truncate">
                        {ep.nome}
                      </span>
                    )}
                    {ep && !ep.nomeEtapa && ep.objetivo && (
                      <span className="text-xs text-muted-foreground hidden sm:block truncate">
                        — {ep.objetivo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-muted-foreground">
                      {grupo.formacoes.length} formação{grupo.formacoes.length !== 1 ? "ões" : ""}
                    </span>
                    {grupo.expanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {grupo.expanded && (
                  <div className="p-4 space-y-3 bg-muted/10">
                    {grupo.formacoes.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {ep
                          ? "Nenhuma formação cadastrada para este eixo."
                          : "Nenhuma formação cadastrada."}
                      </p>
                    )}

                    {grupo.formacoes.map((formacao, fIdx) => {
                      const globalNum =
                        grupos
                          .slice(0, grupoIdx)
                          .reduce((s, g) => s + g.formacoes.length, 0) +
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
                              <span className="text-xs text-muted-foreground">{titulo}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFormacao(grupoIdx, formacao.tempId)}
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
                                  updateFormacao(grupoIdx, formacao.tempId, "tema", e.target.value)
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
                                  updateFormacao(grupoIdx, formacao.tempId, "objetivo", e.target.value)
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
                                  updateFormacao(grupoIdx, formacao.tempId, "observacoesFormador", e.target.value)
                                }
                                placeholder="Observações, contexto ou instruções para o formador..."
                                className="min-h-[56px] text-sm resize-none"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="grid gap-1.5">
                                <Label className="text-xs">Carga (h)</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={formacao.cargaHoraria}
                                  onChange={(e) =>
                                    updateFormacao(grupoIdx, formacao.tempId, "cargaHoraria", e.target.value)
                                  }
                                  className="h-9 text-sm"
                                />
                              </div>

                              <div className="grid gap-1.5">
                                <Label className="text-xs">Modalidade</Label>
                                <Select
                                  value={formacao.modalidade}
                                  onValueChange={(v) =>
                                    v && updateFormacao(grupoIdx, formacao.tempId, "modalidade", v)
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
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addFormacao(grupoIdx)}
                      className="w-full h-9 gap-1.5 text-xs border-dashed"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {ep ? "Adicionar formação ao eixo" : "Adicionar formação"}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
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
