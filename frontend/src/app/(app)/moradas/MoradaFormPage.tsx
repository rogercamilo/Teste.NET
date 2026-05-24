"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMoradas, usePlanos, useGrades, useComunidade, useEtapaLabels, db } from "@/lib/data-store";
import {
  NIVEL_CORES,
  type Morada,
  type NivelFormativo,
} from "@/types";
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
  Layers,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const NIVEL_ICONS: Record<NivelFormativo, string> = {
  "pre-discipulado": "🌱",
  discipulado: "📖",
  "primeiras-promessas": "🌟",
  "formacao-permanente": "🔥",
};

const NIVEIS: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

type FormState = {
  nome: string;
  nivelFormativo: NivelFormativo;
  formadorId: string;
  planoId: string;
  gradeId: string;
  vigenciaInicio: string;
  vigenciaFim: string;
};

const EMPTY_FORM: FormState = {
  nome: "",
  nivelFormativo: "pre-discipulado",
  formadorId: "",
  planoId: "",
  gradeId: "",
  vigenciaInicio: "",
  vigenciaFim: "",
};

const formadores = db.usuarios
  .load()
  .filter((u) => u.perfil === "formador_comunitario" && u.ativo);

export default function MoradaFormPage() {
  const router = useRouter();
  const [, setMoradas] = useMoradas();
  const [comunidade] = useComunidade();
  const termoMorada = comunidade.termoMorada?.trim() || "Morada";
  const etapaLabels = useEtapaLabels();
  const [allPlanos] = usePlanos();
  const [allGrades] = useGrades();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const availablePlanos = allPlanos.filter(
    (p) =>
      (p.status === "ativo" || p.status === "em-revisao") &&
      p.nivelFormativo === form.nivelFormativo
  );

  const availableGrades = allGrades.filter(
    (g) =>
      g.nivelFormativo === form.nivelFormativo &&
      (form.planoId === "" || g.planoId === form.planoId)
  );

  const selectedFormador = formadores.find((u) => u.id === form.formadorId);
  const selectedPlano = allPlanos.find((p) => p.id === form.planoId);
  const selectedGrade = allGrades.find((g) => g.id === form.gradeId);
  const hasFormador = !!form.formadorId;

  function handleNivelChange(nivel: NivelFormativo) {
    const matchingPlano = allPlanos.find(
      (p) =>
        p.nivelFormativo === nivel &&
        (p.status === "ativo" || p.status === "em-revisao")
    );
    const matchingGrade = matchingPlano
      ? allGrades.find((g) => g.planoId === matchingPlano.id && g.ativo)
      : undefined;
    setForm((prev) => ({
      ...prev,
      nivelFormativo: nivel,
      planoId: matchingPlano?.id ?? "",
      gradeId: matchingGrade?.id ?? "",
    }));
  }

  async function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome é obrigatório.");
    if (
      form.vigenciaFim &&
      form.vigenciaInicio &&
      form.vigenciaFim <= form.vigenciaInicio
    )
      return toast.error("Data de término deve ser posterior à data de início.");

    setSaving(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const payload: Morada = {
        id: `m${Date.now()}`,
        nome: form.nome.trim(),
        nivelFormativo: form.nivelFormativo,
        formadorId: form.formadorId || undefined,
        planoId: form.planoId || undefined,
        gradeId: form.gradeId || undefined,
        vigenciaInicio: form.vigenciaInicio || undefined,
        vigenciaFim: form.vigenciaFim || undefined,
        ativo: hasFormador,
        criadoEm: today,
      };

      setMoradas((prev) => [...prev, payload]);
      toast.success(
        hasFormador
          ? `${termoMorada} criada com sucesso!`
          : `${termoMorada} criada como inativa (sem formador responsável).`
      );
      router.push("/moradas");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/moradas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {termoMorada}s
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Nova {termoMorada}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Preencha os dados abaixo para criar uma nova{" "}
          {termoMorada.toLowerCase()} formativa
        </p>
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
                  Nome da {termoMorada}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.nome}
                  onChange={(e) => set("nome")(e.target.value)}
                  placeholder={`Ex.: ${termoMorada} São João Bosco`}
                  autoFocus
                />
              </div>

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
                      <span className="text-lg">{NIVEL_ICONS[nivel]}</span>
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
                      Sem formador, a {termoMorada.toLowerCase()} será criada
                      como <strong>inativa</strong>.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vinculação Formativa */}
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

          {/* Ações — encerram o fluxo do formulário */}
          <div className="flex items-center justify-between pt-2 pb-2 border-t border-border/60">
            <Button variant="outline" onClick={() => router.push("/moradas")}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.nome.trim()}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Criando...
                </span>
              ) : (
                `Criar ${termoMorada.toLowerCase()}`
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
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-xl">
                    {NIVEL_ICONS[form.nivelFormativo]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {form.nome.trim() || `Nova ${termoMorada}`}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs ${NIVEL_CORES[form.nivelFormativo]}`}
                      >
                        {etapaLabels[form.nivelFormativo]}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          hasFormador
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {hasFormador ? "Ativa" : "Inativa"}
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
                { label: "Etapa formativa selecionada", done: true },
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
                {
                  label: "Plano formativo vinculado",
                  done: !!form.planoId,
                  optional: true,
                },
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
