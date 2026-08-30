"use client";

// ─────────────────────────────────────────────────────────────────────────────
// LandingPage V2 — reescrita da página de vendas segundo "Reescrita PDV - Formattio.md".
//
// Posicionamento: a Formattio preserva e organiza a JORNADA FORMATIVA de cada
// membro (continuidade + memória institucional), não "mais um sistema de cadastro".
// Postura de PRÉ-LANÇAMENTO alinhada às ações de marketing: o CTA primário é
// "Solicitar acesso antecipado" (acompanhado pela equipe), não cadastro automático.
//
// Notas de implementação (não confundir com as notas ESTRATÉGICAS do documento,
// que orientam a equipe e NÃO são publicadas):
//  • Campos [a validar] aparecem com o rótulo "a definir" — preencher com dados
//    reais antes do lançamento público (esta rota é noindex/preview).
//  • As telas do produto são placeholders marcados "Inserir captura real" — trocar
//    por screenshots reais (o documento pede telas reais, não mockups).
//  • CTAs de alta intenção usam mailto (mecanismo honesto que já temos). Follow-up
//    recomendado: endpoint dedicado de "acesso antecipado" com e-mail próprio
//    (o /api/leads/subscribe atual dispara o double opt-in do eBook — impróprio aqui).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import Link from "next/link";
import {
  Users, BookOpen, Calendar, Check, ChevronDown, ChevronRight, Menu, X, ArrowRight,
  Lock, Shield, Globe, Star, CheckCircle2, Loader2, Sparkles,
  Archive, FileWarning, Network, MessageSquare, FileText, Compass, BellRing,
  Building2, Heart, BookMarked, GraduationCap,
} from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { trackMetaEvent } from "@/lib/analytics-config";

// CTAs — mecanismos disponíveis hoje (pré-lançamento).
const CTA_ACESSO = "#acesso-antecipado";
const MAIL = "contato@formattio.com.br";
const CTA_DEMO = `mailto:${MAIL}?subject=${encodeURIComponent("Agendar uma demonstração — Formattio")}`;
const CTA_EQUIPE = `mailto:${MAIL}?subject=${encodeURIComponent("Conversar com a equipe — Formattio")}`;

// ── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false);
  const navLinks = [
    ["Recursos", "/recursos"],
    ["Para quem é", "/para-quem-e"],
    ["Preços", "/precos"],
    ["Blog", "/blog"],
    ["FAQ", "/faq"],
  ];
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img src="/brand/formatio-horizontal-on-dark.svg" alt="Formattio" height={32} className="h-8 w-auto" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg">
            Entrar
          </Link>
          <a href={CTA_ACESSO} className="text-sm font-medium bg-white text-slate-950 hover:bg-slate-100 transition-colors px-4 py-2 rounded-lg">
            Solicitar acesso
          </a>
        </div>

        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-slate-950 px-4 py-4 space-y-3">
          {navLinks.map(([label, href]) => (
            <Link key={label} href={href} onClick={() => setOpen(false)}
              className="block text-sm text-slate-400 hover:text-white py-1">
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-medium text-slate-300 text-center px-4 py-2 rounded-lg border border-white/20">
              Entrar
            </Link>
            <a href={CTA_ACESSO} onClick={() => setOpen(false)} className="text-sm font-medium bg-white text-slate-950 text-center px-4 py-2 rounded-lg">
              Solicitar acesso
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Captura real do produto (org demo, dados fictícios — sem PII) ──────────────

function ProductShot({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      className="w-full h-auto rounded-lg border border-white/10 bg-slate-800"
    />
  );
}

// ── 1. Hero ───────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative bg-slate-950 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 pt-32 pb-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-8">
            <Sparkles className="h-3 w-3" />
            Em pré-lançamento · Acesso antecipado acompanhado
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
            A jornada formativa da sua comunidade,{" "}
            <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              organizada do ingresso à formação permanente.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
            A Formattio reúne formandos, etapas, encontros, presenças, avaliações e documentos
            eclesiásticos em uma plataforma criada para Novas Comunidades e Institutos Religiosos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
            <a
              href={CTA_ACESSO}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
            >
              Solicitar acesso antecipado
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={CTA_DEMO}
              className="flex items-center gap-2 px-6 py-3 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
            >
              Agendar uma demonstração
            </a>
          </div>

          <p className="mt-6 text-xs text-slate-500 flex flex-wrap items-center justify-center lg:justify-start gap-x-2 gap-y-1">
            <span>Sem cartão de crédito</span><span className="text-slate-700">•</span>
            <span>Configuração inicial simples</span><span className="text-slate-700">•</span>
            <span>Dados protegidos</span>
          </p>
        </div>

        {/* Captura real da plataforma — visão geral da jornada (documento §1) */}
        <div className="relative">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
              {["bg-red-500", "bg-yellow-500", "bg-green-500"].map((c, i) => (
                <div key={i} className={`h-2.5 w-2.5 rounded-full ${c}`} />
              ))}
              <div className="ml-3 text-xs text-slate-500 bg-slate-800 rounded px-3 py-1">
                www.formattio.com.br
              </div>
            </div>
            <div className="p-3">
              <ProductShot
                src="/brand/screens/painel-geral.webp"
                alt="Painel geral da Formattio: visão da jornada formativa da comunidade"
                eager
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 2. Faixa de confiança ──────────────────────────────────────────────────────
// Pré-lançamento: a confiança vem da especialização, da transparência e da
// proximidade da equipe — NÃO de números, logotipos ou resultados inexistentes.

function TrustBar() {
  const items = [
    { icon: Compass, label: "Especializada na realidade formativa" },
    { icon: Heart, label: "Acompanhamento próximo da equipe" },
    { icon: Sparkles, label: "Acesso antecipado transparente" },
    { icon: BookOpen, label: "Criada a partir de desafios reais da formação" },
  ];
  return (
    <section className="bg-slate-900 border-y border-white/5 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <p className="text-center text-sm text-slate-400 max-w-3xl mx-auto mb-6 leading-relaxed">
          Criada a partir dos desafios reais de quem precisa organizar a formação, preservar
          histórias e dar continuidade ao acompanhamento de cada pessoa.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-slate-400">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 3. Reconhecimento do problema ──────────────────────────────────────────────

const problemas = [
  {
    icon: Network,
    title: "É difícil saber em que etapa cada pessoa está e o que ainda precisa cumprir.",
  },
  {
    icon: Archive,
    title: "Presenças, avaliações e documentos ficam em lugares diferentes.",
  },
  {
    icon: Users,
    title: "Quando muda o formador, parte do contexto pode se perder.",
  },
  {
    icon: FileWarning,
    title: "Cada grupo registra informações de um jeito, o que dificulta uma visão comum.",
  },
  {
    icon: MessageSquare,
    title: "Decisões importantes dependem de buscas manuais e mensagens em vários canais.",
  },
];

function Problema() {
  return (
    <section className="bg-slate-900 border-b border-white/5 py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">O cenário atual</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">
            Quando as informações estão espalhadas, acompanhar pessoas se torna mais difícil.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A formação exige presença, escuta e continuidade. Mas, na prática, registros importantes
            acabam distribuídos entre planilhas, arquivos, conversas e a memória de quem acompanha
            cada grupo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {problemas.map(({ icon: Icon, title }) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-white/8 bg-slate-800/30 p-6">
              <div className="shrink-0">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed self-center">{title}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-400 max-w-2xl mx-auto">
          A Formattio reúne essa trajetória em um único ambiente, acessível às pessoas autorizadas e
          preparado para acompanhar a formação ao longo do tempo.
        </p>
      </div>
    </section>
  );
}

// ── 4. Transformação central ───────────────────────────────────────────────────

function Transformacao() {
  return (
    <section className="bg-slate-950 py-24">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6">
          <BookMarked className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
          A história de cada formando permanece.{" "}
          <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            Mesmo quando as pessoas responsáveis mudam.
          </span>
        </h2>
        <p className="text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
          Com a Formattio, o novo responsável não precisa começar do zero. Etapas, encontros,
          frequência, avaliações, observações e documentos permanecem organizados em um histórico
          contínuo.
        </p>
        <p className="text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Assim, a comunidade ganha clareza para acompanhar cada pessoa, continuidade entre equipes e
          segurança para preservar sua memória institucional.
        </p>
        <a
          href={CTA_ACESSO}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
        >
          Solicitar acesso antecipado
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

// ── 5. Benefícios organizados por resultado ────────────────────────────────────

const beneficios = [
  {
    icon: Compass,
    title: "Enxergue a jornada completa",
    desc: "Acompanhe o momento de cada formando, as etapas concluídas, os próximos passos e o histórico de sua caminhada em uma visão organizada.",
    color: "bg-violet-500/10 text-violet-400",
  },
  {
    icon: Users,
    title: "Dê continuidade ao acompanhamento",
    desc: "Mantenha informações importantes acessíveis às pessoas autorizadas, sem depender da memória individual ou da permanência de um único formador.",
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    icon: Calendar,
    title: "Padronize sem desumanizar",
    desc: "Estruture planos, grades, encontros, presenças e avaliações sem reduzir a formação a uma sequência automática de tarefas.",
    color: "bg-emerald-500/10 text-emerald-400",
  },
  {
    icon: FileText,
    title: "Preserve documentos e registros",
    desc: "Centralize arquivos e gere documentos previstos no fluxo da instituição, com histórico e organização para consultas futuras.",
    color: "bg-amber-500/10 text-amber-400",
  },
  {
    icon: BookOpen,
    title: "Tome decisões com mais contexto",
    desc: "Consulte informações consolidadas antes de progressões, mudanças de etapa e outras decisões relevantes da jornada.",
    color: "bg-indigo-500/10 text-indigo-400",
  },
  {
    icon: BellRing,
    title: "Comunique com mais clareza",
    desc: "Organize avisos e informações importantes no mesmo ambiente em que a formação é acompanhada.",
    color: "bg-pink-500/10 text-pink-400",
  },
];

function Beneficios() {
  return (
    <section id="recursos" className="bg-slate-950 py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Benefícios</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            O que muda no dia a dia da sua formação
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Funcionalidades traduzidas em resultados concretos para formadores e responsáveis.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {beneficios.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 hover:border-white/20 transition-colors"
            >
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 6. Veja a Formattio por dentro ──────────────────────────────────────────────

const telas = [
  {
    title: "Perfil e linha do tempo do formando",
    desc: "Consulte a trajetória individual: nível formativo, frequência, próximos passos, avaliações, observações e registros relevantes de cada pessoa.",
    src: "/brand/screens/perfil-formando.webp",
  },
  {
    title: "Encontros e frequência",
    desc: "Planeje encontros no calendário da comunidade, registre presenças e acompanhe a participação ao longo do período.",
    src: "/brand/screens/agenda.webp",
  },
  {
    title: "Acompanhamento do grupo",
    desc: "Veja a saúde de cada grupo: formandos ativos, progresso da etapa, presença e quem precisa de atenção.",
    src: "/brand/screens/grupo.webp",
  },
  {
    title: "Biblioteca de formações",
    desc: "Organize o conteúdo em formações reutilizáveis — objetivo, material de apoio e vínculo às grades e à agenda.",
    src: "/brand/screens/formacoes.webp",
  },
  {
    title: "Avaliação nas três perspectivas",
    desc: "Acompanhe a evolução de cada formando nas dimensões humana, espiritual e comunitária adotadas pela instituição.",
    src: "/brand/screens/perspectivas.webp",
  },
];

function PorDentro() {
  return (
    <section className="bg-slate-900 py-24 border-y border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Veja por dentro</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">
            Da visão geral ao histórico individual: tudo conectado à mesma jornada.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {telas.map(({ title, desc, src }, i) => (
            <div
              key={title}
              className={`rounded-2xl border border-white/10 bg-slate-800/30 p-5 ${
                i === 0 ? "md:col-span-2" : ""
              }`}
            >
              <ProductShot src={src} alt={`Formattio — ${title}`} />
              <div className="mt-4">
                <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── 7. Como funciona ────────────────────────────────────────────────────────────

function ComoFunciona() {
  const steps = [
    {
      number: "01",
      title: "Crie o ambiente da sua instituição",
      desc: "Defina quem poderá acessar cada tipo de informação e organize os responsáveis por grupo.",
    },
    {
      number: "02",
      title: "Cadastre ou importe a formação",
      desc: "Registre formandos, grupos, etapas e planos formativos conforme a realidade da sua instituição.",
    },
    {
      number: "03",
      title: "Registre a jornada ao longo do tempo",
      desc: "Encontros, presença, avaliações, progressões e documentos ao longo de todo o percurso formativo.",
    },
    {
      number: "04",
      title: "Consulte o histórico e acompanhe",
      desc: "Uma visão comum entre as pessoas responsáveis, com continuidade entre equipes.",
    },
  ];

  return (
    <section className="bg-slate-950 py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Como funciona</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simples de começar, feito para durar
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {steps.map(({ number, title, desc }) => (
            <div key={number}>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-slate-900 text-primary font-bold text-lg mb-5">
                {number}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href={CTA_ACESSO} className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center">
            Solicitar acesso antecipado
            <ArrowRight className="h-4 w-4" />
          </a>
          <a href={CTA_EQUIPE} className="flex items-center gap-2 px-6 py-3 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center">
            Conversar com a equipe
          </a>
        </div>
      </div>
    </section>
  );
}

// ── 8. Para quem é ──────────────────────────────────────────────────────────────
// Novas Comunidades e Institutos Religiosos em destaque; demais como secundários.

const publicosPrioritarios = [
  {
    type: "Nova Comunidade",
    title: "Formação vocacional estruturada",
    borderClass: "border-t-amber-500",
    iconClass: "bg-amber-500/10 text-amber-400",
    icon: Building2,
    desc: "Organize etapas, grupos, encontros, avaliações e o histórico dos membros desde o ingresso até a formação permanente.",
  },
  {
    type: "Instituto Religioso",
    title: "Processos formativos com rastreabilidade",
    borderClass: "border-t-violet-500",
    iconClass: "bg-violet-500/10 text-violet-400",
    icon: BookMarked,
    desc: "Centralize processos formativos, registros, progressões e documentos com acesso adequado às responsabilidades de cada equipe.",
  },
];

const publicosSecundarios = [
  { icon: Heart, label: "Grupos de oração" },
  { icon: GraduationCap, label: "Centros formativos" },
  { icon: Network, label: "Dioceses e congregações" },
  { icon: Users, label: "Redes formativas" },
];

function ParaQuemE() {
  return (
    <section id="para-quem-e" className="bg-slate-900 py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Para quem é</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">
            Criada para instituições que acompanham uma jornada vocacional e formativa
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {publicosPrioritarios.map(({ type, title, borderClass, iconClass, icon: Icon, desc }) => (
            <div
              key={type}
              className={`rounded-2xl border-t-2 border border-white/10 bg-slate-800/40 p-7 ${borderClass}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-0.5">{type}</p>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-800/20 p-6">
          <p className="text-sm text-slate-400 mb-4">
            <span className="text-slate-300 font-medium">Outras estruturas formativas</span> — centros
            formativos, dioceses, congregações, redes e grupos com processos estruturados também podem
            adaptar a plataforma à sua realidade.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {publicosSecundarios.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-slate-400">
                <Icon className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 9. Respeito à profundidade da formação ──────────────────────────────────────

function Profundidade() {
  const itens = [
    "Planos e grades formativas adaptáveis à realidade da instituição.",
    "Registro de encontros, presenças, avaliações e progressões.",
    "Histórico individual para apoiar transições e decisões.",
    "Perfis e permissões para limitar o acesso a informações sensíveis.",
    "Documentos vinculados aos processos e à trajetória de cada pessoa.",
  ];
  return (
    <section className="bg-slate-950 py-24 border-t border-white/5">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">
            Uma plataforma criada para respeitar a profundidade da formação
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A formação de uma pessoa não cabe em uma planilha. Por isso, a Formattio combina organização
            institucional com espaço para registrar a trajetória humana, espiritual e comunitária de cada
            formando.
          </p>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {itens.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm text-slate-300">
              <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── 10. Segurança, privacidade e responsabilidade ───────────────────────────────

function Seguranca() {
  const itens = [
    { icon: Lock, label: "Acesso por perfis e permissões." },
    { icon: FileText, label: "Registro de alterações e ações relevantes na plataforma." },
    { icon: Shield, label: "Proteção dos dados durante o armazenamento e a transmissão." },
    { icon: Archive, label: "Rotinas de backup e recuperação." },
    { icon: Globe, label: "Recursos e processos de apoio à adequação à LGPD." },
  ];
  return (
    <section className="bg-slate-900 py-24 border-y border-white/5">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Segurança e privacidade</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">
            Informações sensíveis precisam de cuidado compatível com sua importância.
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A Formattio oferece recursos para organizar acessos, proteger registros e apoiar o
            tratamento responsável dos dados da instituição e de seus membros.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {itens.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-800/40 p-5">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <p className="text-sm text-slate-300 leading-relaxed self-center">{label}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/privacidade" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            Conheça nossa página de Segurança e Privacidade
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── 11. Direito canônico e processos institucionais ─────────────────────────────

function DireitoCanonico() {
  return (
    <section className="bg-slate-950 py-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <FileText className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Direito canônico e processos institucionais
              </h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                A Formattio ajuda a instituição a organizar registros e documentos relacionados aos
                seus processos formativos e, quando aplicável, às suas necessidades eclesiásticas.
              </p>
              <p className="text-slate-400 leading-relaxed">
                A plataforma apoia a organização e a rastreabilidade dos registros formativos — sem
                substituir a orientação canônica, jurídica ou a autoridade competente, que permanecem
                sob responsabilidade das pessoas e instâncias adequadas.
              </p>
              <p className="mt-4 text-xs text-slate-500">
                {/* [a validar] — descrever os documentos, fluxos e critérios efetivamente
                    contemplados e a orientação especializada que fundamentou o desenvolvimento. */}
                Documentos, fluxos e critérios contemplados serão detalhados durante o acesso
                antecipado. <span className="italic">(conteúdo a definir com validação especializada)</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── 12. Acesso antecipado ───────────────────────────────────────────────────────

function AcessoAntecipado() {
  const etapas = [
    {
      title: "Conhecemos a realidade da sua instituição",
      desc: "Em uma conversa breve, entendemos como a formação é organizada hoje, quais ferramentas são utilizadas e quais são os principais desafios.",
    },
    {
      title: "Ajudamos na configuração inicial",
      desc: "Orientamos a criação do ambiente, o cadastro dos responsáveis e a organização das primeiras informações.",
    },
    {
      title: "Definimos uma experiência prática",
      desc: "Sua instituição começa com uma ação concreta: cadastrar um grupo, registrar um encontro ou acompanhar uma etapa formativa.",
    },
    {
      title: "Acompanhamos os primeiros dias de uso",
      desc: "Mantemos contato para esclarecer dúvidas, identificar dificuldades e apoiar a continuidade da experiência.",
    },
    {
      title: "Ouvimos as percepções da sua equipe",
      desc: "Ao final do período, conversamos para entender o que funcionou, o que pode melhorar e quais necessidades ainda precisam ser consideradas.",
    },
  ];
  return (
    <section id="acesso-antecipado" className="bg-slate-900 py-24 border-y border-white/5 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Acesso antecipado</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 max-w-2xl mx-auto">
            Conheça a Formattio com o acompanhamento da nossa equipe
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A Formattio está em fase de pré-lançamento. As instituições participantes não recebem
            apenas uma conta para explorar sozinhas: nossa equipe acompanha os primeiros passos,
            ajuda na configuração inicial e orienta uma experiência prática com os recursos da
            plataforma.
          </p>
        </div>

        <ol className="space-y-4 mb-10">
          {etapas.map(({ title, desc }, i) => (
            <li key={title} className="flex gap-4 rounded-2xl border border-white/10 bg-slate-800/40 p-5">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-semibold">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="text-center text-sm text-slate-400 mb-8 max-w-2xl mx-auto">
          Não é necessário reorganizar toda a instituição de uma vez. O primeiro passo pode ser
          simples: cadastrar um grupo, registrar um encontro ou acompanhar uma etapa formativa. As
          condições, a duração e as etapas de participação serão apresentadas no contato inicial.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`mailto:${MAIL}?subject=${encodeURIComponent("Quero participar do acesso antecipado — Formattio")}`}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
          >
            Quero participar do acesso antecipado
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={CTA_EQUIPE}
            className="flex items-center gap-2 px-6 py-3 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
          >
            Conversar com a equipe
          </a>
        </div>
      </div>
    </section>
  );
}

// ── 13. Planos (condições previstas — a validar) ─────────────────────────────────

const planosPrevistos = [
  {
    name: "Básico",
    paraQuem: "Instituições menores",
    limites: ["Membros: a definir", "Usuários internos: a definir", "Módulos essenciais"],
    highlight: false,
  },
  {
    name: "Intermediário",
    paraQuem: "Operações em crescimento",
    limites: ["Membros: a definir", "Usuários internos: a definir", "Jornada Vocacional"],
    highlight: true,
  },
  {
    name: "Avançado",
    paraQuem: "Estruturas maiores ou redes",
    limites: ["Membros: a definir", "Onboarding acompanhado", "Suporte prioritário"],
    highlight: false,
  },
];

function Planos() {
  return (
    <section id="precos" className="bg-slate-950 py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Planos</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Escolha o plano adequado à realidade da sua instituição
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Conheça as condições previstas para o lançamento. Durante o acesso antecipado, a equipe
            apresenta o plano mais adequado à realidade da sua instituição.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-8">
          {planosPrevistos.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.highlight
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-white/10 bg-slate-900/60"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
                  <Star className="h-3 w-3" />
                  Sugerido para a maioria
                </div>
              )}
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{plan.paraQuem}</p>
                <div className="mt-4 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Valor apresentado no acesso antecipado
                </div>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.limites.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={CTA_ACESSO}
                className={`block text-center text-sm font-semibold px-4 py-3 rounded-xl transition-colors ${
                  plan.highlight
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "border border-white/20 text-slate-300 hover:border-white/40 hover:text-white"
                }`}
              >
                Falar sobre o {plan.name}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500">
          Condições, limites e valores em definição. Nenhuma cobrança durante o acesso antecipado.
        </p>
      </div>
    </section>
  );
}

// ── 14. FAQ ──────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: "Preciso instalar algum programa?",
    a: "Não. A Formattio funciona pela internet e pode ser acessada em dispositivos compatíveis, por navegadores atualizados no computador e no celular.",
  },
  {
    q: "É possível importar nossas planilhas atuais?",
    a: "Sim, a plataforma prevê importação de dados. Os formatos aceitos, quem realiza a importação e eventuais condições são apresentados durante o acesso antecipado.",
  },
  {
    q: "Quem pode visualizar avaliações e informações sensíveis?",
    a: "O acesso é definido por perfis e permissões: cada pessoa vê apenas o que sua responsabilidade exige. Informações sensíveis têm acesso restrito e configurável.",
  },
  {
    q: "A Formattio substitui a orientação canônica ou o discernimento dos responsáveis?",
    a: "Não. A plataforma organiza informações e apoia processos; decisões formativas e orientações especializadas permanecem sob responsabilidade das autoridades e pessoas competentes.",
  },
  {
    q: "Como meus dados são protegidos?",
    a: "Os dados são protegidos durante o armazenamento e a transmissão, com acesso por perfis, registro de ações relevantes e rotinas de backup. Consulte a página de Segurança e Privacidade para os detalhes.",
  },
  {
    q: "Posso conhecer a plataforma antes de cadastrar toda a instituição?",
    a: "Sim. No acesso antecipado, sua instituição pode começar por uma situação concreta — cadastrar um grupo, registrar um encontro ou acompanhar uma etapa — com orientação inicial da equipe.",
  },
  {
    q: "O que significa acesso antecipado?",
    a: "É a oportunidade de conhecer a Formattio antes do lançamento oficial, utilizar seus recursos em uma experiência acompanhada e compartilhar percepções que ajudem a aprimorar a plataforma. Duração e condições de participação são apresentadas no contato inicial.",
  },
  {
    q: "Existe suporte durante a implantação?",
    a: "Sim. Durante o acesso antecipado, a equipe acompanha os primeiros passos e esclarece dúvidas. Canais, horários e materiais de apoio são apresentados no contato inicial.",
  },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="faq" className="bg-slate-900 py-24 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white">Perguntas frequentes</h2>
        </div>

        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => (
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
      </div>
    </section>
  );
}

// ── 15. Chamada final ────────────────────────────────────────────────────────────

function ChamadaFinal() {
  return (
    <section className="bg-slate-950 py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Preserve a história de quem está em formação — e a memória da sua instituição.
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Conheça uma plataforma criada para organizar jornadas formativas com continuidade,
            clareza e responsabilidade.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href={CTA_ACESSO} className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center">
              Solicitar acesso antecipado
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href={CTA_DEMO} className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center">
              Agendar uma demonstração
            </a>
          </div>
          <p className="mt-6 text-xs text-slate-500 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Conheça antes do lançamento</span><span className="text-slate-700">•</span>
            <span>Comece por uma experiência concreta</span><span className="text-slate-700">•</span>
            <span>Conte com orientação inicial</span>
          </p>
        </div>
      </div>
    </section>
  );
}

// ── 16. Conversão alternativa: eBook ─────────────────────────────────────────────
// Reaproveita o endpoint público /api/leads/subscribe (double opt-in do eBook).

const EBOOK_TITULO = "Organizando a formação da sua comunidade";

function LeadMagnetSection() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!consent) {
      setErro("É preciso aceitar para continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leads/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone: telefone || undefined,
          whatsappOptIn,
          consent: true,
          website,
        }),
      });
      if (res.status === 429) {
        setErro("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        return;
      }
      if (!res.ok) {
        setErro("Não foi possível enviar. Verifique os dados e tente novamente.");
        return;
      }
      setDone(true);
      trackMetaEvent("Lead", {
        content_name: EBOOK_TITULO,
        content_category: "eBook",
      });
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="materiais" className="bg-slate-900 border-t border-white/5 py-20">
      <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary uppercase tracking-widest mb-4">
            <Sparkles className="h-4 w-4" /> Ainda não é o momento de testar?
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
            Comece organizando seu processo formativo
          </h2>
          <p className="text-slate-400 mb-6 text-sm leading-relaxed">
            Baixe gratuitamente o guia <strong className="text-slate-300">“{EBOOK_TITULO}”</strong> e
            conheça os principais passos para estruturar registros, responsabilidades e continuidade
            na formação.
          </p>
          <ul className="space-y-2.5">
            {[
              "Como organizar etapas e a jornada de cada formando",
              "Governança de dados e conformidade (LGPD) na prática",
              "O que registrar para não perder a memória da comunidade",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-6 md:p-8">
          {done ? (
            <div className="text-center py-6">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Falta só confirmar!</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Enviamos um e-mail para <strong className="text-slate-200">{email}</strong>.
                Abra a mensagem e clique em <strong className="text-slate-200">confirmar</strong> para
                receber o material. Não esqueça de olhar o spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Receba o guia gratuito</h3>

              {/* Honeypot — invisível para humanos */}
              <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Não preencha este campo</label>
                <input
                  id="website" name="website" type="text" tabIndex={-1} autoComplete="off"
                  value={website} onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="lead-nome" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Nome*
                </label>
                <input
                  id="lead-nome" type="text" required value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label htmlFor="lead-email" className="block text-xs font-medium text-slate-400 mb-1.5">
                  E-mail*
                </label>
                <input
                  id="lead-email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="voce@comunidade.org"
                />
              </div>

              <div>
                <label htmlFor="lead-tel" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Telefone / WhatsApp <span className="text-slate-600">(opcional)</span>
                </label>
                <input
                  id="lead-tel" type="tel" value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="(11) 90000-0000"
                />
                <p className="mt-1 text-[11px] text-slate-600">Para novidades e suporte pelo WhatsApp.</p>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox" checked={whatsappOptIn}
                  onChange={(e) => setWhatsappOptIn(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-900 accent-primary"
                />
                Quero receber dicas e novidades pelo Canal do WhatsApp.
              </label>

              <label className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox" checked={consent} required
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-900 accent-primary"
                />
                <span>
                  Autorizo o contato por e-mail e concordo com a{" "}
                  <Link href="/privacidade" className="text-primary hover:underline" target="_blank">
                    Política de Privacidade
                  </Link>.
                </span>
              </label>

              {erro && <p className="text-xs text-red-400">{erro}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                {loading ? "Enviando…" : "Quero o guia gratuito"}
              </button>

              <p className="text-[11px] text-slate-600 text-center">
                Sem spam. Cancele a inscrição quando quiser.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function LandingPageV2() {
  return (
    <div className="font-sans antialiased">
      <Nav />
      <Hero />
      <TrustBar />
      <Problema />
      <Transformacao />
      <Beneficios />
      <PorDentro />
      <ComoFunciona />
      <ParaQuemE />
      <Profundidade />
      <Seguranca />
      <DireitoCanonico />
      <AcessoAntecipado />
      <Planos />
      <FAQ />
      <ChamadaFinal />
      <LeadMagnetSection />
      <MarketingFooter />
    </div>
  );
}
