"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  Sparkles,
  Star,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type { BillingInfo } from "@/lib/billing-data";
import { PLANO_ASSINATURA_LABELS } from "@/types";
import PlanCalculator, { usePlanCalculatorCheckout } from "@/components/PlanCalculator";

interface StripeUpgradeProps {
  initialBilling: BillingInfo | null;
}

const PLANO_CARDS = [
  {
    key: "BASICO" as const,
    descricao: "Para comunidades em início de jornada",
    precoMensal: 97,
    precoAnual: 81,
    totalAnual: 970,
    icon: Zap,
    acento: "sky" as const,
    popular: false,
    features: [
      "Até 60 usuários ativos",
      "2 GB de armazenamento",
      "Todos os módulos incluídos",
      "Suporte por e-mail",
    ],
  },
  {
    key: "INTERMEDIARIO" as const,
    descricao: "Para comunidades em crescimento",
    precoMensal: 197,
    precoAnual: 164,
    totalAnual: 1970,
    icon: Sparkles,
    acento: "violet" as const,
    popular: true,
    features: [
      "Até 140 usuários ativos",
      "10 GB de armazenamento",
      "Todos os módulos incluídos",
      "Jornada Vocacional completa",
      "Suporte prioritário",
    ],
  },
  {
    key: "AVANCADO" as const,
    descricao: "Para grandes organizações formativas",
    precoMensal: 397,
    precoAnual: 331,
    totalAnual: 3970,
    icon: Star,
    acento: "amber" as const,
    popular: false,
    features: [
      "Até 350 usuários ativos",
      "30 GB de armazenamento",
      "Todos os módulos incluídos",
      "Jornada Vocacional completa",
      "Exportação de dados",
      "Suporte dedicado",
    ],
  },
] as const;

const ACENTO: Record<"sky" | "violet" | "amber", {
  icon: string;
  check: string;
  ring: string;
  activeBg: string;
  activeRing: string;
  popularBadge: string;
}> = {
  sky: {
    icon: "text-sky-500",
    check: "text-sky-500",
    ring: "ring-sky-200",
    activeBg: "bg-sky-50/60",
    activeRing: "ring-sky-400",
    popularBadge: "",
  },
  violet: {
    icon: "text-violet-500",
    check: "text-violet-500",
    ring: "ring-violet-200",
    activeBg: "bg-violet-50/60",
    activeRing: "ring-violet-500",
    popularBadge: "bg-violet-600 text-white",
  },
  amber: {
    icon: "text-amber-500",
    check: "text-amber-500",
    ring: "ring-amber-200",
    activeBg: "bg-amber-50/50",
    activeRing: "ring-amber-400",
    popularBadge: "",
  },
};

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function trialDaysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default function StripeUpgrade({ initialBilling }: StripeUpgradeProps) {
  const [billing] = useState<BillingInfo | null>(initialBilling);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [periodicidade, setPeriodicidade] = useState<"mensal" | "anual">("mensal");
  const [expandidoPersonalizado, setExpandidoPersonalizado] = useState(false);
  const { handleCheckout: handlePersonalizadoCheckout, isLoading: isPersonalizadoLoading } =
    usePlanCalculatorCheckout();

  async function handleCheckout(plano: "BASICO" | "INTERMEDIARIO" | "AVANCADO") {
    setUpgrading(plano);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano, periodicidade }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao iniciar checkout");
        return;
      }
      window.location.assign(data.url);
    } catch {
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    } finally {
      setUpgrading(null);
    }
  }

  async function handlePortal() {
    setOpeningPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao abrir portal");
        return;
      }
      window.open(data.url, "_blank");
    } catch {
      toast.error("Erro ao abrir portal. Tente novamente.");
    } finally {
      setOpeningPortal(false);
    }
  }

  if (!billing?.stripeEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Integração com Stripe não configurada. Configure{" "}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">STRIPE_SECRET_KEY</code> para
        habilitar upgrade de plano.
      </p>
    );
  }

  const planoAtual = billing.plano;
  const isPersonalizado = planoAtual === "PERSONALIZADO";

  if (isPersonalizado) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-950/10 p-5">
        <div className="flex items-start gap-3">
          <Star className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
              Plano Personalizado ativo
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400/80">
              Seu plano foi configurado pelo time Formattio. Para ajustes de capacidade,
              faturamento ou renovação, entre em contato com{" "}
              <a
                href="mailto:contato@formattio.com.br"
                className="underline hover:no-underline font-medium"
              >
                contato@formattio.com.br
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trial banner */}
      {billing.status === "TRIAL" && billing.trialExpiresAt && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-amber-900">Período de avaliação</p>
            <p className="text-xs text-amber-700">
              {trialDaysLeft(billing.trialExpiresAt)} dia(s) restante(s). Assine um plano para
              continuar usando após o término.
            </p>
          </div>
        </div>
      )}

      {/* Toggle mensal/anual */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
          <button
            onClick={() => setPeriodicidade("mensal")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              periodicidade === "mensal"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setPeriodicidade("anual")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              periodicidade === "anual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Anual
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              -17%
            </span>
          </button>
        </div>
      </div>

      {periodicidade === "anual" && (
        <p className="text-center text-xs text-emerald-600 font-medium -mt-3">
          Equivale a 2 meses grátis por ano
        </p>
      )}

      {/* Cards grid — sempre visível */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANO_CARDS.map((p) => {
          const Icon = p.icon;
          const est = ACENTO[p.acento];
          const isCurrentPlan = planoAtual === p.key;
          const isActive = billing.hasSubscription && isCurrentPlan;
          const preco = periodicidade === "anual" ? p.precoAnual : p.precoMensal;
          const isLoading = upgrading === p.key;

          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-2xl border transition-all duration-200 ${
                isActive
                  ? `ring-2 ${est.activeRing} border-transparent shadow-md ${est.activeBg}`
                  : p.popular && !billing.hasSubscription
                  ? `ring-2 ${est.ring} border-transparent shadow-lg shadow-violet-100/50 bg-background`
                  : "border-border bg-background hover:border-muted-foreground/30 hover:shadow-sm"
              } p-5`}
            >
              {/* Badge flutuante */}
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] font-semibold text-background shadow-sm">
                    <CheckCircle2 className="h-3 w-3" />
                    Plano atual
                  </span>
                </div>
              )}
              {!isActive && p.popular && !billing.hasSubscription && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    Mais popular
                  </span>
                </div>
              )}

              <div className="flex-1 space-y-4">
                {/* Header */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-lg p-1.5 ${isActive ? "bg-white/70" : "bg-muted"}`}>
                      <Icon className={`h-4 w-4 ${est.icon}`} />
                    </div>
                    <span className="font-semibold text-foreground">
                      {PLANO_ASSINATURA_LABELS[p.key]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.descricao}</p>
                </div>

                {/* Preço */}
                <div className="space-y-0.5">
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-foreground tracking-tight">
                      R$ {preco}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">/mês</span>
                  </div>
                  {periodicidade === "anual" && (
                    <p className="text-xs text-muted-foreground">
                      R$ {p.totalAnual} cobrado anualmente
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${est.check}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* Info de renovação (só no card ativo) */}
                {isActive && billing.renewsAt && (
                  <div className="rounded-lg bg-white/60 border border-white/80 px-3 py-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-foreground/70">
                      {billing.cancelAtPeriodEnd ? (
                        <>
                          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                          <span>Cancela em <strong className="text-foreground">{formatDate(billing.renewsAt)}</strong></span>
                        </>
                      ) : (
                        <>
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          <span>Renova em <strong className="text-foreground">{formatDate(billing.renewsAt)}</strong></span>
                        </>
                      )}
                    </div>
                    {billing.amountCents && billing.currency && (
                      <p className="text-foreground/60">
                        {formatCurrency(billing.amountCents, billing.currency)}/mês
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="mt-5 pt-4 border-t border-border/40">
                {isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-9 gap-2 bg-white/60 hover:bg-white text-sm font-medium border-white/80"
                    onClick={handlePortal}
                    disabled={openingPortal}
                  >
                    {openingPortal ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Gerenciar assinatura
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={p.popular && !billing.hasSubscription ? "default" : "outline"}
                    className="w-full h-9 text-sm font-medium"
                    onClick={() => handleCheckout(p.key)}
                    disabled={upgrading !== null}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : billing.hasSubscription ? (
                      `Mudar para ${PLANO_ASSINATURA_LABELS[p.key]}`
                    ) : (
                      `Assinar ${PLANO_ASSINATURA_LABELS[p.key]}`
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção Personalizado */}
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-muted/30 to-amber-500/5 overflow-hidden">
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold mb-2">
                <Star className="h-3 w-3" />
                Personalizado
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-0.5">
                Sua organização cresceu além do Avançado?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Acima de 350 membros, o plano Personalizado se adapta ao seu tamanho.
                Calcule o valor agora e assine sem precisar falar com o time.
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
              <div className="sm:text-right">
                <p className="text-[10px] text-muted-foreground">A partir de</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xl font-bold text-foreground">R$ 889</span>
                  <span className="text-muted-foreground text-xs">/mês</span>
                </div>
              </div>
              <button
                onClick={() => setExpandidoPersonalizado((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg transition-colors text-xs whitespace-nowrap"
              >
                {expandidoPersonalizado ? "Fechar" : "Simular meu plano"}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandidoPersonalizado ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {!expandidoPersonalizado && (
            <div className="mt-4 grid grid-cols-2 gap-1.5">
              {[
                "Usuários e grupos ilimitados",
                "SLA com garantia de disponibilidade",
                "Armazenamento calculado automaticamente",
                "Suporte prioritário dedicado",
              ].map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          )}

          {expandidoPersonalizado && (
            <div className="mt-6 pt-6 border-t border-border">
              <PlanCalculator
                onCheckout={handlePersonalizadoCheckout}
                isLoading={isPersonalizadoLoading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Faturas (abaixo do grid quando assinante) */}
      {billing.hasSubscription && billing.invoices.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Últimas faturas
            </p>
          </div>
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
            {billing.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-2.5 bg-background hover:bg-muted/30 transition-colors"
              >
                <span className="text-xs text-muted-foreground">{formatDate(inv.date)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium">
                    {formatCurrency(inv.amountCents, inv.currency)}
                  </span>
                  {inv.status === "paid" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      Pago
                    </Badge>
                  )}
                  {inv.url && (
                    <a
                      href={inv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      PDF
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link de faturamento para não-assinantes */}
      {!billing.hasSubscription && (
        <div className="flex justify-center pt-1">
          <button
            onClick={handlePortal}
            disabled={openingPortal}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {openingPortal ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            Gerenciar faturamento
          </button>
        </div>
      )}
    </div>
  );
}
