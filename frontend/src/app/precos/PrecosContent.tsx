"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, Star, ChevronDown, ChevronRight, ArrowRight,
  Shield, Globe, Lock, Zap, Download, Headphones,
} from "lucide-react";

const PLANOS = [
  {
    name: "Básico",
    precoMensal: 97,
    precoAnual: 81,
    totalAnual: 970,
    desc: "Para comunidades em início de jornada.",
    highlight: false,
    badge: null as string | null,
    features: [
      "Até 60 usuários ativos",
      "2 GB de armazenamento",
      "Todos os módulos incluídos",
      "Suporte por e-mail",
    ],
  },
  {
    name: "Intermediário",
    precoMensal: 197,
    precoAnual: 164,
    totalAnual: 1970,
    desc: "Para comunidades em crescimento.",
    highlight: true,
    badge: "Mais popular" as string | null,
    features: [
      "Até 140 usuários ativos",
      "10 GB de armazenamento",
      "Todos os módulos incluídos",
      "Jornada Vocacional completa",
      "Suporte prioritário",
    ],
  },
  {
    name: "Avançado",
    precoMensal: 397,
    precoAnual: 331,
    totalAnual: 3970,
    desc: "Para grandes organizações formativas.",
    highlight: false,
    badge: null as string | null,
    features: [
      "Até 350 usuários ativos",
      "30 GB de armazenamento",
      "Todos os módulos incluídos",
      "Jornada Vocacional completa",
      "Exportação de dados",
      "Suporte dedicado",
    ],
  },
];

const includedAll = [
  { icon: Shield, label: "Todos os módulos da plataforma", desc: "Presença, avaliação H/E/C, planos e grades, comunicação — sem recursos bloqueados por tier." },
  { icon: Headphones, label: "Suporte em português", desc: "Time brasileiro, resposta em até 24h úteis. Sem barreiras de idioma." },
  { icon: Lock, label: "Segurança e criptografia", desc: "HTTPS/TLS em trânsito, AES-256 em campos sensíveis, logs de auditoria completos." },
  { icon: Globe, label: "Conformidade com a LGPD", desc: "Política de privacidade inclusa, exportação de dados e direito ao esquecimento desde o primeiro dia." },
  { icon: Download, label: "Exportação completa dos dados", desc: "Seus dados em JSON a qualquer momento. Você nunca fica preso na plataforma." },
  { icon: Zap, label: "Atualizações sem custo extra", desc: "Novos recursos e melhorias chegam automaticamente, sem upgrade de plano." },
];

const pricingFaqs = [
  { q: "Posso cancelar a qualquer momento?", a: "Sim. Cancele quando quiser pelo painel de configurações. Você mantém acesso até o fim do período já pago e ainda tem 30 dias para exportar seus dados." },
  { q: "Como funciona o upgrade entre planos?", a: "O upgrade é imediato. O crédito proporcional do plano anterior é abatido na próxima cobrança. Sem taxas de migração." },
  { q: "Aceita boleto ou PIX?", a: "Planos Básico, Intermediário e Avançado são cobrados por cartão de crédito (Stripe). O plano Personalizado aceita boleto e PIX — fale com nossa equipe." },
  { q: "O que acontece ao término do período de experiência?", a: "A plataforma notifica você antes do término. Se não assinar um plano, seus dados ficam disponíveis por mais 30 dias para exportação, depois são excluídos de forma definitiva." },
  { q: "Como funciona o plano anual?", a: "Cobrança em parcela única com desconto de 17% (2 meses grátis). Você pode cancelar, mas o valor anual não é reembolsado proporcionalmente — apenas os ciclos futuros não são cobrados." },
];

function Calculator() {
  const [usuarios, setUsuarios] = useState(500);
  const [periodicidade, setPeriodicidade] = useState<"mensal" | "anual">("mensal");

  const SLIDER_MIN = 500;
  const SLIDER_MAX = 5000;
  const SLIDER_STEP = 50;

  function calcMensal(u: number) {
    const blocos = u <= 500 ? 0 : Math.ceil((u - 500) / 50);
    return 889 + blocos * 100;
  }
  function calcAnualMensal(u: number) { return Math.round(calcMensal(u) * 0.83); }
  function calcAnualTotal(u: number) { return Math.round(calcMensal(u) * 12 * 0.83); }
  function calcStorage(u: number) { return Math.ceil((u * 25 * 3) / 1024); }

  const preco = periodicidade === "anual" ? calcAnualMensal(usuarios) : calcMensal(usuarios);
  const pct = ((usuarios - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-white/10 p-1">
          {(["mensal", "anual"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodicidade(p)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                periodicidade === p ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              {p === "mensal" ? "Mensal" : "Anual (−17%)"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Membros ativos</span>
        <span className="text-lg font-bold text-white">{usuarios.toLocaleString("pt-BR")}</span>
      </div>

      <div className="relative py-2">
        <div className="relative h-2 bg-slate-700 rounded-full">
          <div className="absolute h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-amber-500 shadow-md pointer-events-none"
            style={{ left: `${pct}%` }}
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
        />
      </div>

      <div className="rounded-xl bg-slate-800/60 border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">R$ {preco.toLocaleString("pt-BR")}</span>
            <span className="text-slate-400 text-sm">/mês</span>
          </div>
          {periodicidade === "anual" && (
            <p className="text-xs text-slate-500 mt-0.5">
              R$ {calcAnualTotal(usuarios).toLocaleString("pt-BR")} cobrado anualmente
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">{calcStorage(usuarios)} GB de armazenamento incluídos</p>
        </div>
        <Link
          href="/registro"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
        >
          Criar conta e assinar
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="text-xs text-slate-500 text-center">
        Acima de 5.000 membros?{" "}
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

function PricingFaq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {pricingFaqs.map(({ q, a }, i) => (
        <button
          key={q}
          onClick={() => setOpen(open === i ? null : i)}
          className="w-full text-left rounded-xl border border-white/10 bg-slate-800/40 hover:border-white/20 transition-colors overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="text-sm font-medium text-white">{q}</span>
            {open === i
              ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            }
          </div>
          {open === i && (
            <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-3">
              {a}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

export function PrecosContent() {
  const [anual, setAnual] = useState(false);
  const [expandido, setExpandido] = useState(false);

  return (
    <>
      {/* Toggle */}
      <section className="bg-slate-950 pt-4 pb-2">
        <div className="max-w-6xl mx-auto px-4 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 border border-white/10 p-1">
            <button
              onClick={() => setAnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                !anual ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnual(true)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                anual ? "bg-white text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Anual
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                −17%
              </span>
            </button>
          </div>
        </div>
        {anual && (
          <p className="text-center text-xs text-emerald-400 font-medium mt-3">
            Equivale a 2 meses grátis por ano
          </p>
        )}
      </section>

      {/* Planos */}
      <section className="bg-slate-950 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PLANOS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-white/10 bg-slate-900/60"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                    <Star className="h-3 w-3" />
                    {plan.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="text-3xl font-bold text-white">
                      R$ {anual ? plan.precoAnual : plan.precoMensal}
                    </span>
                    <span className="text-slate-400 text-sm">/mês</span>
                  </div>
                  {anual && (
                    <p className="text-xs text-slate-500 mb-2">
                      R$ {plan.totalAnual.toLocaleString("pt-BR")} cobrado anualmente
                    </p>
                  )}
                  <p className="text-sm text-slate-400">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-slate-300">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/registro"
                  className={`block text-center text-sm font-semibold px-4 py-3 rounded-xl transition-colors ${
                    plan.highlight
                      ? "bg-primary text-white hover:bg-primary/90"
                      : "border border-white/20 text-slate-300 hover:border-white/40 hover:text-white"
                  }`}
                >
                  Assinar {plan.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Personalizado */}
          <div className="mt-6 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-slate-900 to-amber-950/20 overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold mb-4">
                    <Star className="h-3 w-3" />
                    Personalizado
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                    Sua organização tem necessidades únicas?
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-5">
                    Para dioceses, congregações, redes formativas e organizações acima de 350 membros.
                    Informe a quantidade de membros e calculamos o valor ideal para o seu caso.
                    Pagamento mensal ou anual.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Usuários e grupos ilimitados",
                      "Armazenamento calculado automaticamente",
                      "SLA com garantia de disponibilidade",
                      "Onboarding guiado pelo time Formattio",
                      "Suporte prioritário dedicado",
                      "Faturamento por boleto ou PIX",
                      "Contratos personalizados",
                      "Treinamento para formadores",
                    ].map((f) => (
                      <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 md:min-w-[200px] shrink-0">
                  <div className="md:text-right">
                    <p className="text-xs text-slate-500 mb-1">A partir de</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-white">R$ 889</span>
                      <span className="text-slate-400 text-sm">/mês</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Mensal ou anual</p>
                  </div>
                  <button
                    onClick={() => setExpandido((v) => !v)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl transition-colors text-sm whitespace-nowrap"
                  >
                    {expandido ? "Fechar calculadora" : "Simular meu plano"}
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandido ? "rotate-180" : ""}`} />
                  </button>
                  <p className="text-xs text-slate-500 md:text-right">Retorno em até 24h úteis</p>
                </div>
              </div>

              {expandido && (
                <div className="mt-8 pt-8 border-t border-white/10">
                  <p className="text-sm font-medium text-slate-300 mb-4">
                    Arraste para indicar o número de membros ativos da sua organização:
                  </p>
                  <Calculator />
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Preços em reais. Cancele a qualquer momento. Plano anual cobrado em parcela única.
          </p>
        </div>
      </section>
    </>
  );
}

export { PricingFaq };
