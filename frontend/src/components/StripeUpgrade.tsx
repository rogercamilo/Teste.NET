"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, ExternalLink, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

interface OrgBilling {
  plano: "GRATUITO" | "ESSENCIAL" | "PROFISSIONAL";
  status: string;
  stripeEnabled: boolean;
  hasSubscription: boolean;
}

const PLANO_LABELS = { GRATUITO: "Gratuito", ESSENCIAL: "Essencial", PROFISSIONAL: "Profissional" };

export default function StripeUpgrade() {
  const [billing, setBilling] = useState<OrgBilling | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    fetch("/api/stripe/billing-info")
      .then((r) => r.json() as Promise<OrgBilling>)
      .then(setBilling)
      .catch(() => setBilling(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(plano: "ESSENCIAL" | "PROFISSIONAL") {
    setUpgrading(plano);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano }),
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
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
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

  if (loading) {
    return <div className="h-24 bg-muted rounded animate-pulse" />;
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

  return (
    <div className="space-y-4">
      <Separator />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Plano atual</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {billing.status === "TRIAL" ? "Período de avaliação" : "Assinatura ativa"}
          </p>
        </div>
        <Badge variant="secondary" className="font-medium">
          {PLANO_LABELS[billing.plano]}
        </Badge>
      </div>

      {billing.hasSubscription ? (
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
      ) : (
        <div className="space-y-2">
          {billing.plano === "GRATUITO" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleUpgrade("ESSENCIAL")}
                disabled={upgrading !== null}
              >
                {upgrading === "ESSENCIAL" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 text-amber-500" />
                )}
                Assinar Essencial
              </Button>
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => handleUpgrade("PROFISSIONAL")}
                disabled={upgrading !== null}
              >
                {upgrading === "PROFISSIONAL" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Assinar Profissional
              </Button>
            </>
          )}
          {billing.plano === "ESSENCIAL" && (
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => handleUpgrade("PROFISSIONAL")}
              disabled={upgrading !== null}
            >
              {upgrading === "PROFISSIONAL" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Upgrade para Profissional
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground"
            onClick={handlePortal}
            disabled={openingPortal}
          >
            {openingPortal ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Gerenciar faturamento
          </Button>
        </div>
      )}
    </div>
  );
}
