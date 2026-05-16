"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGrades, useFormacoes, db } from "@/lib/data-store";
import { extractDocumentFields } from "@/lib/doc-extract";
import {
  NIVEL_FORMATIVO_LABELS,
  MODALIDADE_LABELS,
  type NivelFormativo,
  type GradeFormativa,
  type Eixo,
  type EixoPlano,
  type Formacao,
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
  Paperclip,
  Plus,
  Trash2,
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
  documentoUrl: string;
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
  documentoUrl: "",
};

type FormacaoInput = {
  tempId: string;
  tema: string;
  objetivo: string;
  descricao: string;
  formadorId: string;
  cargaHoraria: string;
  modalidade: Modalidade;
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
  };
}

export default function GradeFormPage({ id }: { id?: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role ?? "formador_comunitario";
  const isFormadorGeral = role === "formador_geral";

  const [grades, setGrades] = useGrades();
  const [, setFormacoes] = useFormacoes();
  const [allPlanos] = useState(() => db.planos.load());
  const [allUsuarios] = useState(() => db.usuarios.load());
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [eixosComFormacoes, setEixosComFormacoes] = useState<EixoComFormacoes[]>([]);
  const [extracting, setExtracting] = useState(false);
  const initialized = useRef(false);
  const isEditing = !!id;

  useEffect(() => {
    if (!id || initialized.current) return;
    const g = grades.find((x) => x.id === id);
    if (!g) return;
    setForm({
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
      documentoUrl: localStorage.getItem(`doc_${id}`) ?? "",
    });

    if (isFormadorGeral) {
      const plano = allPlanos.find((p) => p.id === g.planoId);
      if (plano && plano.eixos.length > 0) {
        const existingFormacoes = db.formacoes.load().filter((f) => f.gradeId === id);
        setEixosComFormacoes(
          plano.eixos.map((ep) => ({
            eixoPlano: ep,
            formacoes: existingFormacoes
              .filter((f) => f.eixoNome === ep.nome)
              .map((f) => ({
                tempId: f.id,
                tema: f.tema,
                objetivo: f.objetivo,
                descricao: f.descricao,
                formadorId: f.formadorId,
                cargaHoraria: String(f.cargaHoraria),
                modalidade: f.modalidade,
              })),
            expanded: true,
          }))
        );
      }
    }

    initialized.current = true;
  }, [id, grades]);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function handlePlanoChange(planoId: string | null) {
    if (!planoId) return;
    const plano = allPlanos.find((p) => p.id === planoId);
    setForm((prev) => ({
      ...prev,
      planoId,
      nivelFormativo: plano?.nivelFormativo ?? prev.nivelFormativo,
    }));
    if (isFormadorGeral && plano && plano.eixos.length > 0) {
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

  async function handleDocumentoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    try {
      const { objetivos, fundamentacao, dataUrl } = await extractDocumentFields(file);
      setForm((prev) => {
        const next = { ...prev, documentoNome: file.name, documentoUrl: dataUrl };
        const willFillObjetivos = !!objetivos && !prev.objetivos.trim();
        const willFillFundamentacao = !!fundamentacao && !prev.fundamentacao.trim();
        if (willFillObjetivos) next.objetivos = objetivos;
        if (willFillFundamentacao) next.fundamentacao = fundamentacao;
        const filled = [
          willFillObjetivos && "Objetivos",
          willFillFundamentacao && "Fundamentação",
        ]
          .filter(Boolean)
          .join(" e ");
        if (filled) {
          toast.success(`Campos preenchidos a partir do documento: ${filled}`);
        } else if (objetivos || fundamentacao) {
          const pending = { objetivos, fundamentacao };
          toast("Conteúdo encontrado no documento", {
            description: "Os campos já estão preenchidos. Deseja substituir?",
            action: {
              label: "Substituir",
              onClick: () =>
                setForm((p) => ({
                  ...p,
                  objetivos: pending.objetivos || p.objetivos,
                  fundamentacao: pending.fundamentacao || p.fundamentacao,
                })),
            },
          });
        } else {
          toast.info("Documento anexado. Conteúdo não identificado automaticamente.");
        }
        return next;
      });
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

    for (const ec of eixosComFormacoes) {
      for (const f of ec.formacoes) {
        if (!f.tema.trim()) {
          return toast.error(
            `Preencha o tema de todas as formações do eixo "${ec.eixoPlano.nome}".`
          );
        }
      }
    }

    const plano = allPlanos.find((p) => p.id === form.planoId);
    const entId = id ?? `g${Date.now()}`;
    const today = new Date().toISOString().split("T")[0];
    const nivelFormativo = plano?.nivelFormativo ?? form.nivelFormativo;
    const existing = isEditing ? grades.find((g) => g.id === id) : undefined;

    const eixos: Eixo[] =
      eixosComFormacoes.length > 0
        ? eixosComFormacoes.map((ec, idx) => ({
            id: `e${entId}-${idx}`,
            nome: ec.eixoPlano.nome,
            descricao: ec.eixoPlano.objetivo,
            gradeId: entId,
            ordem: idx + 1,
            cor: EIXO_HEX[idx % EIXO_HEX.length],
          }))
        : parseEixos(form.eixos, entId);

    const totalFormacoes = eixosComFormacoes.reduce(
      (sum, ec) => sum + ec.formacoes.length,
      0
    );

    const payload: GradeFormativa = {
      id: entId,
      nome: form.nome.trim(),
      planoId: form.planoId,
      planoNome: plano?.nome ?? "",
      nivelFormativo,
      vigenciaInicio: form.vigenciaInicio,
      vigenciaFim: form.vigenciaFim,
      versao: form.versao || "1.0",
      eixos,
      etapas: existing?.etapas ?? [],
      totalFormacoes: totalFormacoes || (existing?.totalFormacoes ?? 0),
      objetivos: form.objetivos.trim() || undefined,
      fundamentacao: form.fundamentacao.trim() || undefined,
      documentoAnexo: form.documentoNome || undefined,
      ativo: true,
      criadoEm: existing?.criadoEm ?? today,
    };

    if (isFormadorGeral && eixosComFormacoes.length > 0) {
      const novasFormacoes: Formacao[] = eixosComFormacoes.flatMap((ec, idx) =>
        ec.formacoes.map((f) => ({
          id: `fm${Date.now()}-${Math.random().toString(36).slice(2)}`,
          tema: f.tema.trim(),
          objetivo: f.objetivo.trim(),
          descricao: f.descricao.trim(),
          nivelFormativo,
          eixoId: eixos[idx].id,
          eixoNome: ec.eixoPlano.nome,
          formadorId: f.formadorId,
          formadorNome: allUsuarios.find((u) => u.id === f.formadorId)?.nome ?? "",
          cargaHoraria: Number(f.cargaHoraria) || 2,
          modalidade: f.modalidade,
          tipoFormacao: "comunitaria" as const,
          gradeId: entId,
          gradeNome: form.nome.trim(),
          vezesUtilizada: 0,
          criadoEm: today,
        }))
      );
      setFormacoes((prev) => [
        ...prev.filter((f) => f.gradeId !== entId),
        ...novasFormacoes,
      ]);
    }

    if (isEditing && id) {
      setGrades((prev) => prev.map((g) => (g.id === id ? payload : g)));
      if (form.documentoUrl) {
        localStorage.setItem(`doc_${entId}`, form.documentoUrl);
      } else if (!form.documentoNome) {
        localStorage.removeItem(`doc_${entId}`);
      }
      toast.success("Grade atualizada com sucesso!");
      router.push(`/grades/${id}`);
    } else {
      setGrades((prev) => [...prev, payload]);
      if (form.documentoUrl) localStorage.setItem(`doc_${entId}`, form.documentoUrl);
      toast.success("Grade criada com sucesso!");
      router.push("/grades");
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
            <Select value={form.planoId} onValueChange={handlePlanoChange} items={Object.fromEntries(allPlanos.map((p) => [p.id, `${p.nome} (${NIVEL_FORMATIVO_LABELS[p.nivelFormativo]})`]))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano..." />
              </SelectTrigger>
              <SelectContent>
                {allPlanos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span>{p.nome}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({NIVEL_FORMATIVO_LABELS[p.nivelFormativo]})
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
              items={NIVEL_FORMATIVO_LABELS}
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
                    {NIVEL_FORMATIVO_LABELS[n]}
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
            <Label className="flex items-center gap-2">
              Documento da grade
              {extracting && (
                <span className="text-xs text-primary animate-pulse">Lendo documento…</span>
              )}
            </Label>
            {form.documentoNome ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-muted/40">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{form.documentoNome}</span>
                <button
                  type="button"
                  onClick={removerDocumento}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label
                className={`flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border bg-muted/20 transition-colors ${
                  extracting
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:bg-muted/40"
                }`}
              >
                <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Selecionar PDF ou Word (.pdf, .docx, .doc)
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  disabled={extracting}
                  onChange={handleDocumentoInput}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* ── Eixos e Formações (card separado) ── */}
      {isFormadorGeral && eixosComFormacoes.length > 0 && (
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
                    {ec.eixoPlano.nome}
                  </span>
                  {ec.eixoPlano.objetivo && (
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

                  {ec.formacoes.map((formacao, fIdx) => (
                    <div
                      key={formacao.tempId}
                      className="rounded-lg border border-border/60 bg-card p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Formação {fIdx + 1}
                        </span>
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
                          <Label className="text-xs">Objetivo</Label>
                          <Textarea
                            value={formacao.objetivo}
                            onChange={(e) =>
                              updateFormacao(eixoIdx, formacao.tempId, "objetivo", e.target.value)
                            }
                            placeholder="Objetivo desta formação..."
                            className="min-h-[60px] text-sm resize-none"
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
                              items={Object.fromEntries(allUsuarios.filter((u) => u.ativo).map((u) => [u.id, u.nome]))}
                            >
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Selecionar..." />
                              </SelectTrigger>
                              <SelectContent>
                                {allUsuarios
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
                  ))}

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
        >
          Cancelar
        </Button>
        <Button onClick={handleSave}>
          {isEditing ? "Salvar alterações" : "Criar grade"}
        </Button>
      </div>
    </div>
  );
}
