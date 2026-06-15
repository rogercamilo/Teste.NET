import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, Zap, Shield, Globe, Lock, Download, Headphones,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PrecosContent, PricingFaq } from "./PrecosContent";

export const metadata: Metadata = {
  title: "Preços — Formattio",
  description:
    "Planos Básico (R$97/mês), Intermediário (R$197/mês) e Avançado (R$397/mês). 30 dias de experiência com acesso completo. Sem cartão de crédito.",
  openGraph: {
    title: "Preços — Formattio",
    description:
      "Planos transparentes para cada tamanho de comunidade. Comece sem compromisso, escale conforme cresce.",
    type: "website",
    locale: "pt_BR",
  },
};

const includedAll = [
  { icon: Shield, label: "Todos os módulos", desc: "Presença, avaliação H/E/C, planos, grades, comunicação — nada bloqueado por tier." },
  { icon: Headphones, label: "Suporte em português", desc: "Time brasileiro, resposta em até 24h úteis. Sem barreiras de idioma." },
  { icon: Lock, label: "Segurança e criptografia", desc: "HTTPS/TLS em trânsito, AES-256 em campos sensíveis, logs de auditoria." },
  { icon: Globe, label: "Conformidade LGPD", desc: "Política de privacidade inclusa, exportação de dados e direito ao esquecimento." },
  { icon: Download, label: "Exportação de dados", desc: "Seus dados em JSON a qualquer momento. Você nunca fica preso na plataforma." },
  { icon: Zap, label: "Atualizações gratuitas", desc: "Novos recursos e melhorias chegam automaticamente, sem upgrade de plano." },
];

const trialSteps = [
  { num: "01", title: "Crie sua conta", desc: "Cadastre-se em menos de 2 minutos. Sem cartão de crédito." },
  { num: "02", title: "30 dias com acesso completo", desc: "Explore todos os módulos, configure grupos e convide formadores." },
  { num: "03", title: "Escolha seu plano", desc: "Assine o plano que melhor se adapta ao tamanho da sua comunidade." },
];

export default function PrecosPage() {
  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="relative bg-slate-950 pt-32 pb-10 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
            <Zap className="h-3 w-3" />
            30 dias de experiência · Sem cartão de crédito
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-5">
            Planos para cada{" "}
            <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              tamanho de comunidade
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Comece sem compromisso. Escale conforme sua comunidade cresce. Sem taxas ocultas, sem contrato de fidelidade.
          </p>
        </div>
      </section>

      {/* Pricing (client component — toggle + cards + calculator) */}
      <PrecosContent />

      {/* Incluído em todos os planos */}
      <section className="bg-slate-900 border-t border-white/5 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Sem asteriscos</p>
            <h2 className="text-3xl font-bold text-white mb-4">
              Incluído em todos os planos
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Não existe versão "lite" do Formattio. Todos os planos entregam a plataforma completa —
              a diferença está apenas no número de usuários e no armazenamento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {includedAll.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-800/30 p-5">
                <div className="flex-none h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">{label}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona o período de experiência */}
      <section className="bg-slate-950 border-t border-white/5 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Sem risco</p>
            <h2 className="text-3xl font-bold text-white mb-4">
              Como funciona o período de experiência
            </h2>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-6 inset-x-0 h-px bg-white/15 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trialSteps.map(({ num, title, desc }) => (
              <div key={num} className="relative z-10 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-slate-950 text-primary font-bold text-lg mb-4 ring-4 ring-slate-950">
                  {num}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Cancele a qualquer momento
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Seus dados sempre disponíveis para exportação
            </span>
          </div>
        </div>
      </section>

      {/* FAQ de preços */}
      <section className="bg-slate-900 border-t border-white/5 py-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-10">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Dúvidas frequentes</p>
            <h2 className="text-3xl font-bold text-white">Perguntas sobre planos e cobrança</h2>
          </div>
          <PricingFaq />
          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Outras dúvidas?{" "}
              <Link href="/faq" className="text-primary hover:underline">
                Veja todas as perguntas frequentes
              </Link>
              {" "}ou{" "}
              <a href="mailto:contato@formattio.com.br" className="text-primary hover:underline">
                fale com a gente
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-slate-950 py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Pronto para começar?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Cadastre-se e explore o Formattio por 30 dias com acesso completo. Sem cartão de crédito.
              Sem compromisso.
            </p>
            <Link
              href="/registro"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              Cadastre-se gratuitamente
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-slate-500">
              30 dias de acesso completo · Sem cartão de crédito · Cancele a qualquer momento
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
