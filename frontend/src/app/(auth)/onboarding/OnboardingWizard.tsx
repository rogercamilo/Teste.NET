"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Building2, Settings, Home, CheckCircle2, ChevronRight } from "lucide-react";

interface OrgData {
  id: string;
  nome: string;
  descricao: string | null;
  endereco: string | null;
  missao: string | null;
  anoFundacao: string | null;
  termoMorada: string;
  termoFormando: string;
  termoFormador: string;
  termoPreDiscipulado: string;
  termoDiscipulado: string;
  termoPrimeirasPromessas: string;
  termoFormacaoPermanente: string;
}

const STEPS = [
  { id: 1, label: "Organização", icon: Building2 },
  { id: 2, label: "Terminologia", icon: Settings },
  { id: 3, label: "Primeira Morada", icon: Home },
];

export default function OnboardingWizard({ org }: { org: OrgData }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [nome, setNome] = useState(org.nome);
  const [descricao, setDescricao] = useState(org.descricao ?? "");
  const [endereco, setEndereco] = useState(org.endereco ?? "");
  const [missao, setMissao] = useState(org.missao ?? "");
  const [anoFundacao, setAnoFundacao] = useState(org.anoFundacao ?? "");

  // Step 2
  const [termoMorada, setTermoMorada] = useState(org.termoMorada);
  const [termoFormando, setTermoFormando] = useState(org.termoFormando);
  const [termoFormador, setTermoFormador] = useState(org.termoFormador);
  const [termoPreDiscipulado, setTermoPreDiscipulado] = useState(org.termoPreDiscipulado);
  const [termoDiscipulado, setTermoDiscipulado] = useState(org.termoDiscipulado);
  const [termoPrimeirasPromessas, setTermoPrimeirasPromessas] = useState(org.termoPrimeirasPromessas);
  const [termoFormacaoPermanente, setTermoFormacaoPermanente] = useState(org.termoFormacaoPermanente);

  // Step 3
  const [moradaNome, setMoradaNome] = useState("");
  const [moradaEndereco, setMoradaEndereco] = useState("");
  const [moradaNivel, setMoradaNivel] = useState("pre-discipulado");

  async function saveStep1() {
    const res = await fetch("/api/organizacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao, endereco, missao, anoFundacao }),
    });
    if (!res.ok) throw new Error("Falha ao salvar organização");
  }

  async function saveStep2() {
    const res = await fetch("/api/organizacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        termoMorada, termoFormando, termoFormador,
        termoPreDiscipulado, termoDiscipulado, termoPrimeirasPromessas, termoFormacaoPermanente,
      }),
    });
    if (!res.ok) throw new Error("Falha ao salvar terminologia");
  }

  async function saveStep3() {
    // Mark onboarding as done first to prevent duplicate moradas if the user retries
    const flagRes = await fetch("/api/organizacao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingConcluido: true }),
    });
    if (!flagRes.ok) throw new Error("Falha ao concluir onboarding");

    if (moradaNome.trim()) {
      const res = await fetch("/api/moradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: moradaNome.trim(), endereco: moradaEndereco || undefined, nivelFormativo: moradaNivel }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Falha ao criar morada");
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
        await saveStep3();
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
          <h1 className="text-2xl font-bold text-foreground">Configurar plataforma</h1>
          <p className="text-sm text-muted-foreground mt-1">Siga os passos para começar a usar</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex flex-col items-center gap-1.5 ${i > 0 ? "" : ""}`}>
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors
                    ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-px w-16 mx-2 mb-5 transition-colors ${isDone ? "bg-emerald-500" : "bg-border"}`} />
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

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Sobre a organização</h2>
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome da comunidade *</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="h-10" />
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

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Terminologia da comunidade</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Personalize os nomes exibidos na plataforma para refletir a linguagem da sua comunidade.
                  Deixe em branco para usar os termos padrão.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="termoMorada">
                  Grupo de formação{" "}
                  <span className="font-normal text-muted-foreground">(padrão: "Morada")</span>
                </Label>
                <Input id="termoMorada" value={termoMorada} onChange={(e) => setTermoMorada(e.target.value)} placeholder="Morada" className="h-10" />
                <p className="text-xs text-muted-foreground">Ex.: Grupo, Célula, Casa, Comunidade</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="termoFormando">
                  Membro do grupo{" "}
                  <span className="font-normal text-muted-foreground">(padrão: "Formando")</span>
                </Label>
                <Input id="termoFormando" value={termoFormando} onChange={(e) => setTermoFormando(e.target.value)} placeholder="Formando" className="h-10" />
                <p className="text-xs text-muted-foreground">Ex.: Membro, Participante, Discípulo, Jovem</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="termoFormador">
                  Responsável pelo grupo{" "}
                  <span className="font-normal text-muted-foreground">(padrão: "Formador Comunitário")</span>
                </Label>
                <Input id="termoFormador" value={termoFormador} onChange={(e) => setTermoFormador(e.target.value)} placeholder="Formador Comunitário" className="h-10" />
                <p className="text-xs text-muted-foreground">Ex.: Líder, Coordenador, Responsável</p>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-foreground">Etapas do percurso formativo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Como sua comunidade denomina cada etapa da jornada formativa.
                  Deixe em branco para usar os nomes padrão.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="termoPreDiscipulado">
                    1.ª etapa{" "}
                    <span className="font-normal text-muted-foreground">(padrão: "Pré-Discipulado")</span>
                  </Label>
                  <Input id="termoPreDiscipulado" value={termoPreDiscipulado} onChange={(e) => setTermoPreDiscipulado(e.target.value)} placeholder="Pré-Discipulado" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="termoDiscipulado">
                    2.ª etapa{" "}
                    <span className="font-normal text-muted-foreground">(padrão: "Discipulado")</span>
                  </Label>
                  <Input id="termoDiscipulado" value={termoDiscipulado} onChange={(e) => setTermoDiscipulado(e.target.value)} placeholder="Discipulado" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="termoPrimeirasPromessas">
                    3.ª etapa{" "}
                    <span className="font-normal text-muted-foreground">(padrão: "Primeiras Promessas")</span>
                  </Label>
                  <Input id="termoPrimeirasPromessas" value={termoPrimeirasPromessas} onChange={(e) => setTermoPrimeirasPromessas(e.target.value)} placeholder="Primeiras Promessas" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="termoFormacaoPermanente">
                    4.ª etapa{" "}
                    <span className="font-normal text-muted-foreground">(padrão: "Formação Permanente")</span>
                  </Label>
                  <Input id="termoFormacaoPermanente" value={termoFormacaoPermanente} onChange={(e) => setTermoFormacaoPermanente(e.target.value)} placeholder="Formação Permanente" className="h-10" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-foreground">Criar primeira morada</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Opcional — você pode adicionar moradas depois em Gestão → Moradas.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moradaNome">Nome da morada</Label>
                <Input
                  id="moradaNome"
                  placeholder="Ex: Morada São João"
                  value={moradaNome}
                  onChange={(e) => setMoradaNome(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moradaEndereco">Endereço</Label>
                <Input
                  id="moradaEndereco"
                  placeholder="Opcional"
                  value={moradaEndereco}
                  onChange={(e) => setMoradaEndereco(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moradaNivel">Nível formativo</Label>
                <select
                  id="moradaNivel"
                  value={moradaNivel}
                  onChange={(e) => setMoradaNivel(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="pre-discipulado">{termoPreDiscipulado || "Pré-Discipulado"}</option>
                  <option value="discipulado">{termoDiscipulado || "Discipulado"}</option>
                  <option value="primeiras-promessas">{termoPrimeirasPromessas || "Primeiras Promessas"}</option>
                  <option value="formacao-permanente">{termoFormacaoPermanente || "Formação Permanente"}</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              onClick={() => { setError(null); setStep(s => s - 1); }}
              disabled={step === 1 || loading}
            >
              Voltar
            </Button>
            <Button onClick={handleNext} disabled={loading} className="gap-1.5">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {step === 3 ? "Finalizando..." : "Salvando..."}
                </span>
              ) : (
                <>
                  {step === 3 ? "Concluir e ir para o Dashboard" : "Próximo"}
                  {step < 3 && <ChevronRight className="h-4 w-4" />}
                </>
              )}
            </Button>
          </div>
        </div>

        {step < 3 && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Pode configurar esses detalhes depois em Configurações.
          </p>
        )}
      </div>
    </div>
  );
}
