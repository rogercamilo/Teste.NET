"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Sparkles,
  Star,
  Zap,
  Receipt,
  CalendarDays,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { BillingInfo } from "@/lib/billing-data";
import { PLANO_ASSINATURA_LABELS } from "@/types";

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

const ACENTO_STYLES = {
  sky: {
    icon: "text-sky-500",
    ring: "ring-sky-200 dark:ring-sky-800",
    badge: "bg-sky-50 text-sky-700 border-sky-200",
    check: "text-sky-500",
    btn: "border-sky-200 hover:border-sky-300 hover:bg-sky-50",
  },
  violet: {
    icon: "text-violet-500",
    ring: "ring-violet-300 dark:ring-violet-700",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    check: "text-violet-500",
    btn: "",
  },
  amber: {
    icon: "text-amber-500",
    ring: "ring-amber-200 dark:ring-amber-800",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    check: "text-amber-500",
    btn: "border-amber-200 hover:border-amber-300 hover:bg-amber-50",
  },
} as const;

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

  async function handleUpgrade(plano: "BASICO" | "INTERMEDIARIO" | "AVANCADO") {
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

      {/* Assinante ativo */}
      {billing.hasSubscription ? (
        <div className="space-y-4">
          {/* Status da assinatura */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  Plano atual
                </p>
                <p className="text-lg font-semibold text-foreground">
                  {PLANO_ASSINATURA_LABELS[planoAtual]}
                </p>
                {billing.renewsAt && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {billing.cancelAtPeriodEnd ? (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        <span>Cancela em {formatDate(billing.renewsAt)}</span>
                      </>
                    ) : (
                      <>
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>Renova em {formatDate(billing.renewsAt)}</span>
                        {billing.amountCents && billing.currency && (
                          <span className="text-foreground/60">
                            · {formatCurrency(billing.amountCents, billing.currency)}/mês
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <Badge variant="outline" className="shrink-0 text-xs font-medium">
                {billing.cancelAtPeriodEnd ? "Cancelando" : "Ativo"}
              </Badge>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 h-9"
              onClick={handlePortal}
              disabled={openingPortal}
            >
              {openingPortal ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Gerenciar assinatura
            </Button>
          </div>

          {/* Faturas */}
          {billing.invoices.length > 0 && (
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
                    className="flex items-center justify-between px-4 py-2.5 text-sm bg-background hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-muted-foreground text-xs">
                      {formatDate(inv.date)}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-xs">
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
        </div>
      ) : isPersonalizado ? (
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Plano personalizado configurado pelo suporte. Entre em contato para alterações.
          </p>
        </div>
      ) : (
        /* Pricing grid */
        <div className="space-y-5">
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
            <p className="text-center text-xs text-emerald-600 font-medium">
              Equivale a 2 meses grátis por ano
            </p>
          )}

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANO_CARDS.map((p) => {
              const Icon = p.icon;
              const isCurrentPlan = planoAtual === p.key;
              const preco = periodicidade === "anual" ? p.precoAnual : p.precoMensal;
              const estilos = ACENTO_STYLES[p.acento];
              const isLoading = upgrading === p.key;

              return (
                <div
                  key={p.key}
                  className={`relative flex flex-col rounded-2xl border bg-background p-5 transition-all duration-200 ${
                    p.popular
                      ? `ring-2 ${estilos.ring} border-transparent shadow-lg shadow-violet-100/50`
                      : "border-border hover:border-muted-foreground/30 hover:shadow-sm"
                  }`}
                >
                  {p.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                        <Sparkles className="h-3 w-3" />
                        Mais popular
                      </span>
                    </div>
                  )}

                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`rounded-lg p-1.5 ${p.popular ? "bg-violet-100" : "bg-muted"}`}>
                          <Icon className={`h-4 w-4 ${estilos.icon}`} />
                        </div>
                        <span className="font-semibold text-foreground">
                          {PLANO_ASSINATURA_LABELS[p.key]}
                        </span>
                        {isCurrentPlan && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 h-4 ml-auto ${estilos.badge}`}>
                            Atual
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {p.descricao}
                      </p>
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
                          <CheckCircle2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${estilos.check}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="mt-5 pt-4 border-t border-border/60">
                    {isCurrentPlan ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Plano atual
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant={p.popular ? "default" : "outline"}
                        className="w-full h-9 gap-2 text-sm font-medium"
                        onClick={() => handleUpgrade(p.key)}
                        disabled={upgrading !== null}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Assinar {PLANO_ASSINATURA_LABELS[p.key]}
                            {!isLoading && <span className="opacity-60 text-xs ml-auto">→</span>}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Manage billing link */}
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
        </div>
      )}
    </div>
  );
}
