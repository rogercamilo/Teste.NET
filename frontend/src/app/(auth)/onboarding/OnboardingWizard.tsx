"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle, Building2, Settings, Home, CheckCircle2,
  ChevronRight, Palette, Upload, X, Check, Users, BookOpen, GraduationCap, Heart, CreditCard,
} from "lucide-react";
import { THEME_PALETTES, applyThemePalette } from "@/lib/themes";
import type { TipoOrganizacao, TipoGrupoFormacao } from "@/types";
import { TIPO_ORGANIZACAO_LABELS } from "@/types";

interface OrgData {
  id: string;
  nome: string;
  tipoOrganizacao: string;
  descricao: string | null;
  endereco: string | null;
  missao: string | null;
  anoFundacao: string | null;
  logoUrl: string | null;
  temaCor: string;
  planoAssinatura: string;
  termoGrupoFormacao: string;
  termoFormando: string;
  termoFormador: string;
  termoPreDiscipulado: string;
  termoDiscipulado: string;
  termoPrimeirasPromessas: string;
  termoFormacaoPermanente: string;
}

const STEPS = [
  { id: 1, label: "Organização", icon: Building2 },
  { id: 2, label: "Visual", icon: Palette },
  { id: 3, label: "Plano", icon: CheckCircle2 },
  { id: 4, label: "Configurações", icon: Settings },
  { id: 5, label: "Primeiro Grupo", icon: Home },
];

const PLANOS = [
  {
    key: "BASICO",
    nome: "Básico",
    preco: "R$ 97",
    periodo: "/mês",
    desc: "Para comunidades que estão começando.",
    recursos: ["Até 60 usuários ativos", "2 GB de armazenamento", "Grupos ilimitados"],
  },
  {
    key: "INTERMEDIARIO",
    nome: "Intermediário",
    preco: "R$ 197",
    periodo: "/mês",
    desc: "Para comunidades em crescimento.",
    recursos: ["Até 140 usuários ativos", "10 GB de armazenamento", "Grupos ilimitados"],
    destaque: true,
  },
  {
    key: "AVANCADO",
    nome: "Avançado",
    preco: "R$ 397",
    periodo: "/mês",
    desc: "Para organizações de grande porte.",
    recursos: ["Até 350 usuários ativos", "30 GB de armazenamento", "Grupos ilimitados"],
  },
];

const TIPO_ORG_OPTIONS: {
  key: TipoOrganizacao;
  icon: React.ElementType;
  desc: string;
}[] = [
  { key: "nova_comunidade", icon: Heart, desc: "Formação vocacional com etapas canônicas e progressão estruturada." },
  { key: "grupo_oracao", icon: Users, desc: "Grupos de oração, aprofundamento bíblico e encontros espirituais." },
  { key: "instituto_religioso", icon: GraduationCap, desc: "Instituto, seminário ou centro de formação religiosa." },
  { key: "centro_formativo", icon: BookOpen, desc: "Centro de cursos, retiros e formações livres." },
];

export default function OnboardingWizard({ org, initialStep = 1 }: { org: OrgData; initialStep?: number }) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 1 — org info
  const [nome, setNome] = useState(org.nome);
  const [tipoOrg, setTipoOrg] = useState<TipoOrganizacao>(
    (org.tipoOrganizacao as TipoOrganizacao) ?? "nova_comunidade"
  );
  const [descricao, setDescricao] = useState(org.descricao ?? "");
  const [endereco, setEndereco] = useState(org.endereco ?? "");
  const [missao, setMissao] = useState(org.missao ?? "");
  const [anoFundacao, setAnoFundacao] = useState(org.anoFundacao ?? "");

  // Step 2 — visual identity
  const [logo, setLogo] = useState<string | null>(org.logoUrl);
  const [themeKey, setThemeKey] = useState(org.temaCor ?? "Formattio");

  // Step 3 — plan
  const [plano, setPlano] = useState(
    org.planoAssinatura && org.planoAssinatura !== "GRATUITO" ? org.planoAssinatura : "INTERMEDIARIO"
  );

  // Restaura o plano selecionado quando o usuário volta do Stripe sem concluir o pagamento
  useEffect(() => {
    if (initialStep === 3) {
      const saved = sessionStorage.getItem("onboarding_plano");
      if (saved) {
        setPlano(saved);
        sessionStorage.removeItem("onboarding_plano");
      }
    }
  }, [initialStep]);

  // Step 4 — terminology (empty = usa os termos padrão do sistema)
  const [termoGrupoFormacao, setTermoGrupoFormacao] = useState("");
  const [termoFormando, setTermoFormando] = useState("");
  const [termoFormador, setTermoFormador] = useState("");
  const [termoPreDiscipulado, setTermoPreDiscipulado] = useState("");
  const [termoDiscipulado, setTermoDiscipulado] = useState("");
  const [termoPrimeirasPromessas, setTermoPrimeirasPromessas] = useState("");
  const [termoFormacaoPermanente, setTermoFormacaoPermanente] = useState("");

  // Step 5 — first group
  const [grupoFormacaoNome, setGrupoFormacaoNome] = useState("");
  const [grupoFormacaoLocalReuniao, setGrupoFormacaoLocalReuniao] = useState("");
  const [grupoTipo, setGrupoTipo] = useState<TipoGrupoFormacao>(
    tipoOrg === "nova_comunidade" ? "estruturado" : "livre"
  );
  const [grupoFormacaoNivel, setGrupoFormacaoNivel] = useState("pre-discipulado");

  function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Selecione um arquivo de imagem."); return; }
    if (file.size > 1.5 * 1024 * 1024) { setError("Logo muito grande. Máximo 1,5 MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => setLogo(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleThemeSelect(key: string) {
    setThemeKey(key);
    applyThemePalette(key);
  }

  function handleTipoOrgSelect(tipo: TipoOrganizacao) {
    setTipoOrg(tipo);
    setGrupoTipo(tipo === "nova_comunidade" ? "estruturado" : "livre");
  }

  async function saveStep1() {
    const res = await fetch("/api/organizacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, tipoOrganizacao: tipoOrg, descricao, endereco, missao, anoFundacao }),
    });
    if (!res.ok) throw new Error("Falha ao salvar organização");
  }

  async function saveStep2() {
    const res = await fetch("/api/organizacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: logo ?? null, temaCor: themeKey }),
    });
    if (!res.ok) throw new Error("Falha ao salvar identidade visual");
  }

  async function saveStep3() {
    const res = await fetch("/api/organizacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planoAssinatura: plano }),
    });
    if (!res.ok) throw new Error("Falha ao salvar plano");
  }

  async function handleStripeCheckout() {
    if (!plano) return;
    setError(null);
    setLoading(true);
    sessionStorage.setItem("onboarding_plano", plano);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano, periodicidade: "mensal", context: "onboarding" }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Erro ao iniciar pagamento");
      window.location.href = data.url!;
    } catch (err) {
      sessionStorage.removeItem("onboarding_plano");
      setError(err instanceof Error ? err.message : "Erro ao processar pagamento");
    } finally {
      setLoading(false);
    }
  }

  async function saveStep4() {
    const res = await fetch("/api/organizacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termoGrupoFormacao, termoFormando, termoFormador,
        termoPreDiscipulado, termoDiscipulado, termoPrimeirasPromessas, termoFormacaoPermanente,
      }),
    });
    if (!res.ok) throw new Error("Falha ao salvar terminologia");
  }

  async function saveStep5() {
    const flagRes = await fetch("/api/organizacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingConcluido: true }),
    });
    if (!flagRes.ok) throw new Error("Falha ao concluir onboarding");

    if (grupoFormacaoNome.trim()) {
      const payload: Record<string, unknown> = {
        nome: grupoFormacaoNome.trim(),
        tipo: grupoTipo,
        ...(grupoFormacaoLocalReuniao ? { localReuniao: grupoFormacaoLocalReuniao } : {}),
        ...(grupoTipo === "estruturado" ? { nivelFormativo: grupoFormacaoNivel } : {}),
      };
      const res = await fetch("/api/grupos-formacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Falha ao criar grupo de formação");
      }
    }
  }

  async function handleNext() {
    setError(null);
    setLoading(true);
    try {
      if (step === 1) {
        if (!nome.trim()) throw new Error("Nome da organização é obrigatório");
        await saveStep1();
        setStep(2);
      } else if (step === 2) {
        await saveStep2();
        setStep(3);
      } else if (step === 3) {
        setStep(4);
      } else if (step === 4) {
        await saveStep4();
        setStep(5);
      } else if (step === 5) {
        await saveStep5();
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/brand/formatio-horizontal.svg"
            alt="Formattio"
            className="h-8 mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-foreground">Vamos configurar sua plataforma</h1>
          <p className="text-sm text-muted-foreground mt-1">Leva apenas alguns minutos.</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors
                    ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-10 mx-1 mb-5 transition-colors ${isDone ? "bg-emerald-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1 — Org info */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Sobre a organização</h2>

              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome da organização *</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="h-10" />
              </div>

              {/* Tipo de organização */}
              <div className="space-y-2">
                <Label>Tipo de organização *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPO_ORG_OPTIONS.map(({ key, icon: Icon, desc }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTipoOrgSelect(key)}
                      className={`flex flex-col items-start gap-1.5 p-3 rounded-xl border-2 text-left transition-all ${
                        tipoOrg === key
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${tipoOrg === key ? "text-primary" : "text-muted-foreground"}`} />
                        <span className={`text-xs font-semibold leading-tight ${tipoOrg === key ? "text-primary" : "text-foreground"}`}>
                          {TIPO_ORGANIZACAO_LABELS[key]}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="missao">Missão</Label>
                <Textarea id="missao" value={missao} onChange={(e) => setMissao(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="anoFundacao">Ano de fundação</Label>
                  <Input id="anoFundacao" value={anoFundacao} onChange={(e) => setAnoFundacao(e.target.value)} placeholder="Ex: 1995" className="h-10" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Visual identity */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="font-semibold text-foreground">Identidade visual</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure o logo e a cor do tema que aparecerão na plataforma.
                </p>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo da organização</Label>
                <div
                  className="relative border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleLogoFile(f); }}
                >
                  {logo ? (
                    <div className="flex items-center gap-3 w-full">
                      <img src={logo} alt="Logo preview" className="h-12 max-w-[120px] object-contain rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium">Logo carregado</p>
                        <p className="text-xs text-muted-foreground">Clique para trocar</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setLogo(null); }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Arraste o logo ou <span className="text-primary">clique para selecionar</span>
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, SVG · Máximo 1,5 MB</p>
                    </>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Opcional — pode adicionar depois em Configurações.</p>
              </div>

              {/* Theme color */}
              <div className="space-y-2">
                <Label>Cor do tema</Label>
                <div className="flex flex-wrap gap-3">
                  {THEME_PALETTES.map((palette) => (
                    <button
                      key={palette.key}
                      type="button"
                      onClick={() => handleThemeSelect(palette.key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                        themeKey === palette.key
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full shrink-0"
                        style={{ backgroundColor: palette.preview }}
                      />
                      {palette.label}
                      {themeKey === palette.key && <Check className="h-3.5 w-3.5 text-primary ml-0.5" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Plan */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Escolha seu plano</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Você pode alterar o plano a qualquer momento em Configurações.
                </p>
              </div>
              <div className="space-y-3">
                {PLANOS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlano(p.key)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      plano === p.key
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{p.nome}</span>
                          {p.destaque && (
                            <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                          <span className="text-lg font-bold text-foreground">{p.preco}</span>
                          <span className="text-xs text-muted-foreground">{p.periodo}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                        <ul className="mt-2 space-y-0.5">
                          {p.recursos.map((r) => (
                            <li key={r} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        plano === p.key ? "border-primary bg-primary" : "border-border"
                      }`}>
                        {plano === p.key && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Terminology */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Terminologia da comunidade</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personalize os nomes exibidos na plataforma. Deixe em branco para usar os termos padrão.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="termoGrupoFormacao">Grupo de formação <span className="font-normal text-muted-foreground">(Ex: "Morada", "Célula")</span></Label>
                <Input id="termoGrupoFormacao" value={termoGrupoFormacao} onChange={(e) => setTermoGrupoFormacao(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="termoFormando">Membro do grupo <span className="font-normal text-muted-foreground">(Ex: "Formando")</span></Label>
                <Input id="termoFormando" value={termoFormando} onChange={(e) => setTermoFormando(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="termoFormador">Responsável pelo grupo <span className="font-normal text-muted-foreground">(Ex: "Formador Comunitário", "Formador")</span></Label>
                <Input id="termoFormador" value={termoFormador} onChange={(e) => setTermoFormador(e.target.value)}  className="h-10" />
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-xs font-medium text-foreground mb-3">Etapas do percurso formativo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="termoPreDiscipulado">1.ª etapa <span className="font-normal text-muted-foreground">(Ex: "Postulantado")</span></Label>
                    <Input id="termoPreDiscipulado" value={termoPreDiscipulado} onChange={(e) => setTermoPreDiscipulado(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="termoDiscipulado">2.ª etapa <span className="font-normal text-muted-foreground">(Ex: "Discipulado")</span></Label>
                    <Input id="termoDiscipulado" value={termoDiscipulado} onChange={(e) => setTermoDiscipulado(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="termoPrimeirasPromessas">3.ª etapa <span className="font-normal text-muted-foreground">(Ex: "Primeiras Promessas")</span></Label>
                    <Input id="termoPrimeirasPromessas" value={termoPrimeirasPromessas} onChange={(e) => setTermoPrimeirasPromessas(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="termoFormacaoPermanente">4.ª etapa <span className="font-normal text-muted-foreground">(Ex: "Formação Permanente")</span></Label>
                    <Input id="termoFormacaoPermanente" value={termoFormacaoPermanente} onChange={(e) => setTermoFormacaoPermanente(e.target.value)} className="h-10" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — First group */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Crie o seu primeiro grupo de formação</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Opcional — pode adicionar seus grupos depois em Gestão → Grupos de formação.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grupoFormacaoNome">Nome do grupo de formação</Label>
                <Input id="grupoFormacaoNome" placeholder={`Ex: ${termoGrupoFormacao || "Grupo"} São João`} value={grupoFormacaoNome} onChange={(e) => setGrupoFormacaoNome(e.target.value)} className="h-10" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grupoFormacaoLocalReuniao">Local de reunião</Label>
                <Input id="grupoFormacaoLocalReuniao" placeholder="Ex: Centro de evangelização, Capela" value={grupoFormacaoLocalReuniao} onChange={(e) => setGrupoFormacaoLocalReuniao(e.target.value)} className="h-10" />
              </div>

              {/* Tipo do grupo */}
              <div className="space-y-2">
                <Label>Tipo de grupo de formação</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGrupoTipo("estruturado")}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                      grupoTipo === "estruturado"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className={`text-xs font-semibold ${grupoTipo === "estruturado" ? "text-primary" : "text-foreground"}`}>
                      Jornada vocacional
                    </span>
                    <p className="text-xs text-muted-foreground leading-snug">Grupos para etapas vocacionais com progressão formal.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrupoTipo("livre")}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                      grupoTipo === "livre"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <span className={`text-xs font-semibold ${grupoTipo === "livre" ? "text-primary" : "text-foreground"}`}>
                      Jornada livre
                    </span>
                    <p className="text-xs text-muted-foreground leading-snug">Grupos de oração, escolas de formação ou cursos pontuais.</p>
                  </button>
                </div>
              </div>

              {/* Etapa formativa — só para grupos estruturados */}
              {grupoTipo === "estruturado" && (
                <div className="space-y-1.5">
                  <Label htmlFor="grupoFormacaoNivel">Etapa formativa</Label>
                  <select
                    id="grupoFormacaoNivel"
                    value={grupoFormacaoNivel}
                    onChange={(e) => setGrupoFormacaoNivel(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="pre-discipulado">{termoPreDiscipulado || "Pré-Discipulado"}</option>
                    <option value="discipulado">{termoDiscipulado || "Discipulado"}</option>
                    <option value="primeiras-promessas">{termoPrimeirasPromessas || "Primeiras Promessas"}</option>
                    <option value="formacao-permanente">{termoFormacaoPermanente || "Formação Permanente"}</option>
                  </select>
                </div>
              )}

              {grupoTipo === "livre" && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  Grupos livres não possuem etapa formativa definida.
                </p>
              )}
            </div>
          )}

          <div className="mt-6">
            {step === 3 ? (
              <div className="space-y-3">
                <Button onClick={handleStripeCheckout} disabled={loading} className="w-full gap-2">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Redirecionando...
                    </span>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Contratar {PLANOS.find((p) => p.key === plano)?.nome ?? ""} agora
                    </>
                  )}
                </Button>
                <div className="flex items-center justify-between">
                  <Button variant="ghost" onClick={() => { setError(null); setStep(2); }} disabled={loading}>
                    Voltar
                  </Button>
                  <Button variant="ghost" onClick={handleNext} disabled={loading} className="gap-1 text-muted-foreground hover:text-foreground">
                    Quero o período de experiência
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => { setError(null); setStep((s) => s - 1); }}
                  disabled={step === 1 || loading}
                >
                  Voltar
                </Button>
                <Button onClick={handleNext} disabled={loading} className="gap-1.5">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      {step === 5 ? "Finalizando..." : "Salvando..."}
                    </span>
                  ) : (
                    <>
                      {step === 5 ? "Concluir e ir para o Dashboard" : "Próximo"}
                      {step < 5 && <ChevronRight className="h-4 w-4" />}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {step < 5 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Pode configurar esses detalhes depois em Configurações.
          </p>
        )}
      </div>
    </div>
  );
}
