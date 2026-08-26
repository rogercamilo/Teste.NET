"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useComunidade, useEtapaLabels } from "@/lib/data-store";
import {
  NIVEL_CORES,
  TIPO_GRUPO_FORMACAO_LABELS,
  type PlanoFormativo,
  type GradeFormativa,
  type NivelFormativo,
  type TipoGrupoFormacao,
  type Usuario,
} from "@/types";
import { NivelFormativoIcon } from "@/components/nivel-formativo-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Home,
  Info,
  Layers,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const NIVEIS: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

type FormState = {
  nome: string;
  tipo: TipoGrupoFormacao;
  nivelFormativo: NivelFormativo;
  formadorId: string;
  planoId: string;
  gradeId: string;
  vigenciaInicio: string;
  vigenciaFim: string;
};

interface GrupoFormacaoFormPageProps {
  initialPlanos?: PlanoFormativo[];
  initialGrades?: GradeFormativa[];
  initialUsuarios?: Usuario[];
}

export default function GrupoFormacaoFormPage({
  initialPlanos = [],
  initialGrades = [],
  initialUsuarios = [],
}: GrupoFormacaoFormPageProps) {
  const router = useRouter();
  const [comunidade] = useComunidade();
  const termoGrupoFormacao = comunidade.termoGrupoFormacao?.trim() || "Grupo de Formação";
  const termoFormando = comunidade.termoFormando?.trim() || "Formando";
  const tipoOrg = comunidade.tipoOrganizacao ?? "nova_comunidade";
  const etapaLabels = useEtapaLabels();
  const formadores = initialUsuarios.filter((u) => u.perfil === "formador_comunitario" && u.ativo);
  const [form, setForm] = useState<FormState>(() => ({
    nome: "",
    tipo: tipoOrg === "nova_comunidade" ? "estruturado" : "livre",
    nivelFormativo: "pre-discipulado",
    formadorId: "",
    planoId: "",
    gradeId: "",
    vigenciaInicio: "",
    vigenciaFim: "",
  }));
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const availablePlanos = initialPlanos.filter(
    (p) =>
      p.status !== "arquivado" &&
      p.nivelFormativo === form.nivelFormativo
  );

  const availableGrades = initialGrades.filter(
    (g) =>
      g.nivelFormativo === form.nivelFormativo &&
      (form.planoId === "" || g.planoId === form.planoId)
  );

  const selectedFormador = formadores.find((u) => u.id === form.formadorId);
  const selectedPlano = initialPlanos.find((p) => p.id === form.planoId);
  const selectedGrade = initialGrades.find((g) => g.id === form.gradeId);
  const hasFormador = !!form.formadorId;

  function handleNivelChange(nivel: NivelFormativo) {
    if (form.tipo !== "estruturado") return;
    const matchingPlano = initialPlanos.find(
      (p) => p.nivelFormativo === nivel && p.status !== "arquivado"
    );
    const matchingGrade = matchingPlano
      ? initialGrades.find((g) => g.planoId === matchingPlano.id && g.ativo)
      : undefined;
    setForm((prev) => ({
      ...prev,
      nivelFormativo: nivel,
      planoId: matchingPlano?.id ?? "",
      gradeId: matchingGrade?.id ?? "",
    }));
  }

  function handleTipoChange(tipo: TipoGrupoFormacao) {
    setForm((prev) => ({
      ...prev,
      tipo,
      // limpar plano/grade se mudar para livre
      ...(tipo === "livre" ? { planoId: "", gradeId: "" } : {}),
    }));
  }

  async function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (form.vigenciaFim && form.vigenciaInicio && form.vigenciaFim <= form.vigenciaInicio)
      return toast.error("Data de término deve ser posterior à data de início.");

    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo,
        nivelFormativo: form.tipo === "estruturado" ? form.nivelFormativo : undefined,
        formadorId: form.formadorId || undefined,
        planoId: form.planoId || undefined,
        gradeId: form.gradeId || undefined,
        vigenciaInicio: form.vigenciaInicio || undefined,
        vigenciaFim: form.vigenciaFim || undefined,
      };
      const res = await fetch("/api/grupos-formacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Falha ao criar grupo de formação");
      }
      toast.success(
        hasFormador
          ? `${termoGrupoFormacao} criado com sucesso!`
          : `${termoGrupoFormacao} criado como inativo (sem formador responsável).`
      );
      router.push("/grupos-formacao");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/grupos-formacao"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {termoGrupoFormacao}s
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Nova {termoGrupoFormacao}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Preencha os dados abaixo para criar uma nova{" "}
          {termoGrupoFormacao.toLowerCase()} formativa
        </p>
      </div>

      {/* Nota: objetivo e ganho de criar uma nova grupo de formação */}
      <div className="flex gap-2.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
        <div className="space-y-1.5">
          <p className="text-foreground font-medium">
            Por que criar uma {termoGrupoFormacao.toLowerCase()}?
          </p>
          <p>
            Aqui você abre a {termoGrupoFormacao.toLowerCase()} que vai reunir os {termoFormando.toLowerCase()}s: escolha
            se ela é <span className="font-medium text-foreground">estruturada</span> (segue as etapas canônicas, com
            plano e grade) ou <span className="font-medium text-foreground">livre</span> (oração, retiros ou cursos
            pontuais), defina o formador responsável e o período de vigência. Sem formador, ela nasce inativa — a
            pré-visualização ao lado mostra como ficará.
          </p>
          <p>
            Para o formador comunitário, é o primeiro passo do acompanhamento: uma vez criada, a{" "}
            {termoGrupoFormacao.toLowerCase()} passa a concentrar presença, jornada, comentários e relatórios da{" "}
            {termoGrupoFormacao.toLowerCase()}, e os {termoFormando.toLowerCase()}s podem ser cadastrados e progredir
            pelas etapas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form — ocupa 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Informações Básicas */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5 space-y-4">
              <SectionHeader icon={<Home className="h-3.5 w-3.5 text-primary" />} title="Informações Básicas" />

              <div className="space-y-1.5">
                <Label>
                  Nome da {termoGrupoFormacao}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.nome}
                  onChange={(e) => set("nome")(e.target.value)}
                  placeholder={`Ex.: ${termoGrupoFormacao} São João Bosco`}
                  autoFocus
                />
              </div>

              {/* Tipo de grupo */}
              <div className="space-y-2">
                <Label>Tipo de grupo <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["estruturado", "livre"] as TipoGrupoFormacao[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTipoChange(t)}
                      className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                        form.tipo === t
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <span className={`text-xs font-semibold ${form.tipo === t ? "text-primary" : "text-foreground"}`}>
                        {TIPO_GRUPO_FORMACAO_LABELS[t]}
                      </span>
                      <span className="text-xs text-muted-foreground leading-snug">
                        {t === "estruturado" ? "Etapas canônicas e progressão formal." : "Oração, retiros ou cursos pontuais."}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Etapa formativa — só para grupos estruturados */}
              {form.tipo === "estruturado" && (
                <div className="space-y-2">
                  <Label>
                    Etapa Formativa <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {NIVEIS.map((nivel) => (
                      <button
                        key={nivel}
                        type="button"
                        onClick={() => handleNivelChange(nivel)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                          form.nivelFormativo === nivel
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <NivelFormativoIcon nivel={nivel} className="size-5 shrink-0 text-muted-foreground" />
                        <span
                          className={`text-xs font-medium leading-tight ${
                            form.nivelFormativo === nivel
                              ? "text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {etapaLabels[nivel]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.tipo === "livre" && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  Grupos livres não possuem etapa formativa definida.
                </p>
              )}

            </CardContent>
          </Card>

          {/* Período de Vigência */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5 space-y-4">
              <SectionHeader icon={<Calendar className="h-3.5 w-3.5 text-primary" />} title="Período de Vigência" />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Data de início</Label>
                  <Input
                    type="date"
                    value={form.vigenciaInicio}
                    onChange={(e) => set("vigenciaInicio")(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Data de término</Label>
                  <Input
                    type="date"
                    value={form.vigenciaFim}
                    onChange={(e) => set("vigenciaFim")(e.target.value)}
                    min={form.vigenciaInicio || undefined}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Formador Responsável */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5 space-y-4">
              <SectionHeader icon={<User className="h-3.5 w-3.5 text-primary" />} title="Formador Responsável" />

              <div className="space-y-1.5">
                <Label>Formador Comunitário (Responsável)</Label>
                <Select
                  value={form.formadorId}
                  onValueChange={(v) => set("formadorId")(v ?? "")}
                  items={Object.fromEntries(formadores.map((u) => [u.id, u.nome]))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o formador (opcional)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {formadores.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!form.formadorId && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Sem formador, a {termoGrupoFormacao.toLowerCase()} será criada
                      como <strong>inativa</strong>.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vinculação Formativa — só para grupos estruturados */}
          {form.tipo === "estruturado" && (
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5 space-y-4">
              <SectionHeader icon={<Layers className="h-3.5 w-3.5 text-primary" />} title="Vinculação Formativa" />

              <div className="space-y-1.5">
                <Label>Plano Formativo</Label>
                <Select
                  value={form.planoId}
                  onValueChange={(v) => {
                    set("planoId")(v ?? "");
                    set("gradeId")("");
                  }}
                  items={Object.fromEntries(availablePlanos.map((p) => [p.id, p.nome]))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {availablePlanos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availablePlanos.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum plano ativo para esta etapa formativa.
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Grade Formativa</Label>
                <Select
                  value={form.gradeId}
                  onValueChange={(v) => v && set("gradeId")(v)}
                  items={Object.fromEntries(availableGrades.map((g) => [g.id, `${g.nome} v${g.versao}`]))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a grade..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {availableGrades.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome} v{g.versao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableGrades.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma grade disponível para esta etapa formativa.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Ações — encerram o fluxo do formulário */}
          <div className="flex items-center justify-between pt-2 pb-2 border-t border-border/60">
            <Button variant="outline" onClick={() => router.push("/grupos-formacao")}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.nome.trim()}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Criando...
                </span>
              ) : (
                `Criar ${termoGrupoFormacao.toLowerCase()}`
              )}
            </Button>
          </div>
        </div>

        {/* Preview + Checklist — ocupa 1/3 */}
        <div className="lg:col-span-1">
          <div className="sticky top-20 space-y-4">
            <p className="text-sm font-semibold text-foreground">
              Pré-visualização
            </p>

            <Card
              className={`shadow-sm transition-colors duration-300 ${
                hasFormador
                  ? "border-emerald-200 dark:border-emerald-800"
                  : "border-amber-200 dark:border-amber-800"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                    <NivelFormativoIcon
                      nivel={form.tipo === "estruturado" ? form.nivelFormativo : null}
                      className="size-5"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {form.nome.trim() || `Novo ${termoGrupoFormacao}`}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {form.tipo === "estruturado" ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${NIVEL_CORES[form.nivelFormativo]}`}
                        >
                          {etapaLabels[form.nivelFormativo]}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-slate-100 text-slate-600 border-slate-200">
                          Livre
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          hasFormador
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {hasFormador ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/60 space-y-1.5">
                  {selectedFormador ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Formador:
                      </span>{" "}
                      {selectedFormador.nome}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">
                      Sem formador responsável
                    </p>
                  )}
                  {(form.vigenciaInicio || form.vigenciaFim) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {form.vigenciaInicio
                        ? new Date(
                            form.vigenciaInicio + "T12:00:00"
                          ).toLocaleDateString("pt-BR")
                        : "—"}{" "}
                      até{" "}
                      {form.vigenciaFim
                        ? new Date(
                            form.vigenciaFim + "T12:00:00"
                          ).toLocaleDateString("pt-BR")
                        : "—"}
                    </p>
                  )}
                  {selectedPlano && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      {selectedPlano.nome}
                    </p>
                  )}
                  {selectedGrade && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Grade:
                      </span>{" "}
                      {selectedGrade.nome} v{selectedGrade.versao}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>0 formandos</span>
                </div>
              </CardContent>
            </Card>

            {/* Checklist de preenchimento */}
            <div className="space-y-2 py-1">
              {[
                { label: "Nome preenchido", done: !!form.nome.trim() },
                ...(form.tipo === "estruturado"
                  ? [{ label: "Etapa formativa selecionada", done: true }]
                  : []),
                {
                  label: "Formador responsável",
                  done: hasFormador,
                  optional: true,
                },
                {
                  label: "Período de vigência",
                  done: !!(form.vigenciaInicio && form.vigenciaFim),
                  optional: true,
                },
                ...(form.tipo === "estruturado"
                  ? [{ label: "Plano formativo vinculado", done: !!form.planoId, optional: true }]
                  : []),
              ].map(({ label, done, optional }) => (
                <div key={label} className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-3.5 w-3.5 shrink-0 ${
                      done ? "text-emerald-500" : "text-muted-foreground/30"
                    }`}
                  />
                  <span
                    className={`text-xs ${done ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {label}
                    {optional && !done && (
                      <span className="text-muted-foreground/50">
                        {" "}
                        (opcional)
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}
