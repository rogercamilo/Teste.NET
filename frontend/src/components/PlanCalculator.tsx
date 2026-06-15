"use client";

import { useState } from "react";
import { ArrowRight, Check, HardDrive, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  calcularPrecoMensal,
  calcularPrecoAnualMensal,
  calcularPrecoAnualTotal,
  calcularStorageGB,
  PERSONALIZADO_BASE_USUARIOS,
} from "@/lib/personalizado-pricing";

interface PlanCalculatorProps {
  /** Se fornecido, exibe botão "Assinar" que dispara o checkout Stripe.
   *  Se omitido (landing page), exibe botão que redireciona para /registro. */
  onCheckout?: (usuarios: number, periodicidade: "mensal" | "anual") => Promise<void>;
  isLoading?: boolean;
}

const SLIDER_MIN = PERSONALIZADO_BASE_USUARIOS;
const SLIDER_MAX = 5000;
const SLIDER_STEP = 50;

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR");
}

export default function PlanCalculator({ onCheckout, isLoading }: PlanCalculatorProps) {
  const [usuarios, setUsuarios] = useState(PERSONALIZADO_BASE_USUARIOS);
  const [periodicidade, setPeriodicidade] = useState<"mensal" | "anual">("mensal");

  const precoMensal = calcularPrecoMensal(usuarios);
  const precoAnualMensal = calcularPrecoAnualMensal(usuarios);
  const precoAnualTotal = calcularPrecoAnualTotal(usuarios);
  const storageGB = calcularStorageGB(usuarios);

  const precoExibido = periodicidade === "anual" ? precoAnualMensal : precoMensal;

  const sliderPercent = ((usuarios - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  return (
    <div className="space-y-6">
      {/* Toggle mensal/anual */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-white/10 p-1">
          <button
            onClick={() => setPeriodicidade("mensal")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
              periodicidade === "mensal" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setPeriodicidade("anual")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
              periodicidade === "anual" ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
            }`}
          >
            Anual
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              −17%
            </span>
          </button>
        </div>
      </div>

      {periodicidade === "anual" && (
        <p className="text-center text-xs text-emerald-400 font-medium -mt-2">
          Equivale a 2 meses grátis · R$ {formatBRL(precoAnualTotal)} cobrado anualmente
        </p>
      )}

      {/* Slider de usuários */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">Usuários ativos</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-white">{formatBRL(usuarios)}</span>
            <span className="text-slate-500 text-sm">membros</span>
          </div>
        </div>

        {/* Range input */}
        <div className="relative py-2">
          <div className="relative h-2 bg-slate-700 rounded-full">
            <div
              className="absolute h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${sliderPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-md pointer-events-none transition-all"
              style={{ left: `${sliderPercent}%` }}
            />
          </div>
          <input
            type="range"
            min={SLIDER_MIN}
            max={SLIDER_MAX}
            step={SLIDER_STEP}
            value={usuarios}
            onChange={(e) => setUsuarios(Number(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
            aria-label="Número de usuários"
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>{formatBRL(SLIDER_MIN)}</span>
          <span>{formatBRL(SLIDER_MAX)}+</span>
        </div>

        {/* Preço calculado */}
        <div className="border-t border-white/10 pt-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Valor do plano</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">
                R$ {formatBRL(precoExibido)}
              </span>
              <span className="text-slate-400 text-sm">/mês</span>
            </div>
            {periodicidade === "anual" && (
              <p className="text-xs text-slate-500 mt-1">
                R$ {formatBRL(precoAnualTotal)} cobrado em parcela única
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 sm:items-end">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <HardDrive className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{storageGB} GB de armazenamento incluídos</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Suporte dedicado + SLA + onboarding</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Contrato e faturamento personalizados</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      {onCheckout ? (
        <button
          onClick={() => onCheckout(usuarios, periodicidade)}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold rounded-xl transition-colors text-sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Assinar Personalizado
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      ) : (
        <a
          href="/registro"
          className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-colors text-sm"
        >
          Criar conta e assinar
          <ArrowRight className="h-4 w-4" />
        </a>
      )}

      <p className="text-center text-xs text-slate-500">
        Acima de {formatBRL(SLIDER_MAX)} usuários?{" "}
        <a
          href={`mailto:contato@formattio.com.br?subject=${encodeURIComponent("Plano Personalizado — grande porte")}`}
          className="text-amber-400 hover:underline"
        >
          Fale com o time
        </a>
      </p>
    </div>
  );
}

// Hook para uso na página de billing (StripeUpgrade)
export function usePlanCalculatorCheckout() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleCheckout(usuarios: number, periodicidade: "mensal" | "anual") {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout/personalizado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarios, periodicidade }),
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
      setIsLoading(false);
    }
  }

  return { handleCheckout, isLoading };
}
