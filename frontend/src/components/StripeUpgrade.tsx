"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Sparkles,
  Zap,
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
    precoMensal: "R$ 97",
    precoAnual: "R$ 81",
    totalAnual: "R$ 970",
    usuarios: "60",
    storage: "2 GB",
    features: ["Até 60 usuários ativos", "2 GB de armazenamento"],
    icon: Zap,
    color: "text-sky-600",
  },
  {
    key: "INTERMEDIARIO" as const,
    precoMensal: "R$ 197",
    precoAnual: "R$ 164",
    totalAnual: "R$ 1.970",
    usuarios: "140",
    storage: "10 GB",
    features: ["Até 140 usuários ativos", "10 GB de armazenamento"],
    icon: Sparkles,
    color: "text-violet-600",
    destaque: true,
  },
  {
    key: "AVANCADO" as const,
    precoMensal: "R$ 397",
    precoAnual: "R$ 331",
    totalAnual: "R$ 3.970",
    usuarios: "350",
    storage: "30 GB",
    features: ["Até 350 usuários ativos", "30 GB de armazenamento"],
    icon: Sparkles,
    color: "text-amber-600",
  },
];

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
    month: "short",
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
      window.location.href = data.url;
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
  const planoLabel = PLANO_ASSINATURA_LABELS[planoAtual] ?? planoAtual;
  const isPersonalizado = planoAtual === "PERSONALIZADO";

  return (
    <div className="space-y-4">
      <Separator />

      {/* Trial banner */}
      {billing.status === "TRIAL" && billing.trialExpiresAt && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <span className="text-amber-800">
            <strong>Período trial</strong> — {trialDaysLeft(billing.trialExpiresAt)} dia(s)
            restante(s). Assine um plano para continuar após o término.
          </span>
        </div>
      )}

      {/* Plano atual */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Plano atual</p>
          {billing.hasSubscription && billing.renewsAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {billing.cancelAtPeriodEnd
                ? `Cancela em ${formatDate(billing.renewsAt)}`
                : `Renova em ${formatDate(billing.renewsAt)}`}
              {billing.amountCents && billing.currency && (
                <> · {formatCurrency(billing.amountCents, billing.currency)}/mês</>
              )}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="font-medium">
          {planoLabel}
        </Badge>
      </div>

      {/* Assinante ativo: botão de portal + faturas */}
      {billing.hasSubscription ? (
        <div className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
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

          {billing.invoices.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Últimas faturas</p>
              {billing.invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{formatDate(inv.date)}</span>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(inv.amountCents, inv.currency)}</span>
                    {inv.url && (
                      <a
                        href={inv.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        PDF
                      </a>
                    )}
                    {inv.status === "paid" && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isPersonalizado ? (
        <p className="text-xs text-muted-foreground">
          Plano personalizado configurado pelo suporte. Entre em contato para alterações.
        </p>
      ) : (
        /* Não assinante: toggle + cards de pricing */
        <div className="space-y-3">
          {/* Toggle mensal/anual */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPeriodicidade("mensal")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                periodicidade === "mensal"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setPeriodicidade("anual")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                periodicidade === "anual"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  periodicidade === "anual"
                    ? "bg-emerald-500 text-white"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                2 meses grátis
              </span>
            </button>
          </div>

          {/* Cards */}
          {PLANO_CARDS.map((p) => {
            const Icon = p.icon;
            const isCurrentPlan = planoAtual === p.key;
            const preco = periodicidade === "anual" ? p.precoAnual : p.precoMensal;
            return (
              <div
                key={p.key}
                className={`rounded-lg border p-3 space-y-2 ${
                  p.destaque ? "border-violet-300 bg-violet-50/60" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${p.color}`} />
                    <span className="text-sm font-medium">
                      {PLANO_ASSINATURA_LABELS[p.key]}
                    </span>
                    {p.destaque && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">
                      {preco}
                      <span className="text-xs font-normal text-muted-foreground">/mês</span>
                    </span>
                    {periodicidade === "anual" && (
                      <p className="text-[10px] text-muted-foreground">{p.totalAnual}/ano</p>
                    )}
                  </div>
                </div>
                <ul className="space-y-0.5">
                  {p.features.map((f) => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {!isCurrentPlan && (
                  <Button
                    size="sm"
                    variant={p.destaque ? "default" : "outline"}
                    className="w-full h-7 text-xs"
                    onClick={() => handleUpgrade(p.key)}
                    disabled={upgrading !== null}
                  >
                    {upgrading === p.key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      `Assinar ${PLANO_ASSINATURA_LABELS[p.key]}`
                    )}
                  </Button>
                )}
              </div>
            );
          })}

          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground text-xs"
            onClick={handlePortal}
            disabled={openingPortal}
          >
            {openingPortal ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CreditCard className="h-3.5 w-3.5" />
            )}
            Gerenciar faturamento
          </Button>
        </div>
      )}
    </div>
  );
}
