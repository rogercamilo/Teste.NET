"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, BookOpen, Calendar, BarChart3, Mail,
  Check, ChevronDown, ChevronRight, Menu, X, ArrowRight,
  Lock, Shield, Zap, Globe, Star,
} from "lucide-react";

// ── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img src="/brand/formatio-horizontal-on-dark.svg" alt="Formatio" height={32} className="h-8 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[["Recursos", "#recursos"], ["Preços", "#precos"], ["FAQ", "#faq"]].map(([label, href]) => (
            <a key={label} href={href} className="text-sm text-slate-400 hover:text-white transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5">
            Entrar
          </Link>
          <Link
            href="/registro"
            className="text-sm font-medium bg-white text-slate-950 hover:bg-slate-100 transition-colors px-4 py-2 rounded-lg"
          >
            Começar grátis
          </Link>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-slate-950 px-4 py-4 space-y-3">
          {[["Recursos", "#recursos"], ["Preços", "#precos"], ["FAQ", "#faq"]].map(([label, href]) => (
            <a key={label} href={href} onClick={() => setOpen(false)}
              className="block text-sm text-slate-400 hover:text-white py-1">
              {label}
            </a>
          ))}
          <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white py-1">Entrar</Link>
            <Link href="/registro"
              className="text-sm font-medium bg-white text-slate-950 text-center px-4 py-2 rounded-lg">
              Começar grátis
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-screen bg-slate-950 flex items-center overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 pt-32 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-8">
          <Zap className="h-3 w-3" />
          Plano gratuito disponível · Sem cartão de crédito
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
          Gestão formativa para{" "}
          <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            comunidades que crescem
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Do cadastro ao acompanhamento das formações aplicadas, o Formatio centraliza toda a jornada formativa
          dos seus membros em uma plataforma simples, segura e em conformidade com a LGPD (Lei geral de proteção de dados).
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/registro"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
          >
            Criar conta gratuita
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#recursos"
            className="flex items-center gap-2 px-6 py-3 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
          >
            Ver recursos
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Grátis para sempre com 1 Grupo de formação e até 30 formandos. Sem prazo de expiração.
        </p>

        {/* Dashboard preview */}
        <div className="mt-16 relative mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
              {["bg-red-500", "bg-yellow-500", "bg-green-500"].map((c, i) => (
                <div key={i} className={`h-2.5 w-2.5 rounded-full ${c}`} />
              ))}
              <div className="ml-3 text-xs text-slate-500 bg-slate-800 rounded px-3 py-1">
                app.formatio.com.br/dashboard
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Formandos", value: "142", color: "text-blue-400" },
                { label: "Formações", value: "28", color: "text-emerald-400" },
                { label: "Presenças", value: "94%", color: "text-violet-400" },
                { label: "Moradas", value: "3", color: "text-amber-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-slate-800/60 p-4 border border-white/5">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 grid grid-cols-3 gap-3">
              {["Pré-discipulado", "Discipulado", "Primeiras Promessas"].map((nivel, i) => (
                <div key={nivel} className="rounded-lg bg-slate-800/40 border border-white/5 p-3">
                  <p className="text-xs text-slate-400 truncate">{nivel}</p>
                  <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${["bg-violet-500", "bg-blue-500", "bg-emerald-500"][i]}`}
                      style={{ width: `${[65, 80, 45][i]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -inset-1 bg-gradient-to-b from-transparent to-slate-950 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}

// ── Trust bar ─────────────────────────────────────────────────────────────────

function TrustBar() {
  const items = [
    { icon: Lock, label: "Dados criptografados em trânsito e repouso" },
    { icon: Shield, label: "Conformidade com a LGPD" },
    { icon: Globe, label: "Hospedagem redundante no Brasil" },
    { icon: Star, label: "Suporte em português" },
  ];
  return (
    <section className="bg-slate-900 border-y border-white/5 py-6">
      <div className="max-w-6xl mx-auto px-4">
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

// ── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Users,
    title: "Gestão de formandos",
    desc: "Cadastre membros com histórico completo — nível formativo, presença, documentos, anotações e linha do tempo de eventos.",
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Planos e grades formativas",
    desc: "Estruture o conteúdo em eixos e etapas. Crie grades reutilizáveis por nível e associe planos a cada Grupo de formação.",
    color: "bg-violet-500/10 text-violet-400",
  },
  {
    icon: Calendar,
    title: "Agenda e presenças",
    desc: "Agende formações, registre presenças por sessão e monitore a frequência de cada formando ao longo do tempo.",
    color: "bg-emerald-500/10 text-emerald-400",
  },
  {
    icon: BarChart3,
    title: "Dashboard em tempo real",
    desc: "Visualize métricas de evolução, taxa de realização, distribuição por nível e funil formativo com atualização automática.",
    color: "bg-amber-500/10 text-amber-400",
  },
  {
    icon: Mail,
    title: "Comunicação integrada",
    desc: "Convide formadores por e-mail, personalize templates com a identidade da sua organização e gerencie notificações.",
    color: "bg-pink-500/10 text-pink-400",
  },
  {
    icon: Shield,
    title: "Segurança e conformidade",
    desc: "Logs de auditoria completos, exportação de dados, direito ao esquecimento (LGPD) e política de privacidade incluída.",
    color: "bg-teal-500/10 text-teal-400",
  },
];

function Features() {
  return (
    <section id="recursos" className="bg-slate-950 py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Recursos</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tudo que sua comunidade precisa
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Uma plataforma completa para gerir a jornada formativa dos seus membros,
            do primeiro cadastro à formação permanente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc, color }) => (
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

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Crie sua organização",
      desc: "Em menos de 2 minutos, configure sua comunidade, personalize o nome da plataforma e convide seus formadores por e-mail.",
    },
    {
      number: "02",
      title: "Configure a estrutura",
      desc: "Adicione Grupo de formaçãos, cadastre formandos manualmente ou via importação, e defina planos formativos por nível.",
    },
    {
      number: "03",
      title: "Acompanhe o crescimento",
      desc: "Dashboard em tempo real com métricas de evolução, presença e funil formativo. Histórico completo de cada membro.",
    },
  ];

  return (
    <section className="bg-slate-900 py-24 border-y border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Como funciona</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Simples de começar, poderoso para crescer
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ number, title, desc }, i) => (
            <div key={number} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent -translate-x-4 z-0" />
              )}
              <div className="relative z-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary font-bold text-lg mb-5">
                  {number}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    desc: "Para começar e explorar a plataforma sem compromisso.",
    cta: "Criar conta gratuita",
    ctaHref: "/registro",
    highlight: false,
    features: [
      "1 Grupo de formação (grupo local)",
      "Até 30 formandos",
      "500 MB de armazenamento",
      "Dashboard e relatórios",
      "Planos e grades formativas",
      "Controle de presenças",
      "Suporte por e-mail",
    ],
  },
  {
    name: "Essencial",
    price: "R$ 49",
    period: "/mês",
    desc: "Para organizações em crescimento com múltiplos grupos.",
    cta: "Assinar Essencial",
    ctaHref: "/registro",
    highlight: true,
    badge: "Mais popular",
    features: [
      "3 Grupos de formação",
      "Até 150 formandos",
      "2 GB de armazenamento",
      "Tudo do plano Gratuito",
      "E-mail personalizado (SMTP)",
      "Convites por e-mail",
      "Suporte prioritário",
    ],
  },
  {
    name: "Profissional",
    price: "R$ 149",
    period: "/mês",
    desc: "Para organizações grandes que precisam de escala ilimitada.",
    cta: "Assinar Profissional",
    ctaHref: "/registro",
    highlight: false,
    features: [
      "Grupos de formação ilimitados",
      "Formandos ilimitados",
      "Armazenamento ilimitado",
      "Tudo do plano Essencial",
      "Exportação completa de dados",
      "Suporte dedicado",
      "SLA garantido",
    ],
  },
];

function Pricing() {
  return (
    <section id="precos" className="bg-slate-950 py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Preços</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planos para cada tamanho de comunidade
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Comece gratuitamente. Escale conforme sua comunidade cresce. Sem taxas ocultas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
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
                <div className="flex items-baseline gap-1 mt-2 mb-2">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.period}</span>
                </div>
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
                href={plan.ctaHref}
                className={`block text-center text-sm font-semibold px-4 py-3 rounded-xl transition-colors ${
                  plan.highlight
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "border border-white/20 text-slate-300 hover:border-white/40 hover:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Preços em reais. Cobrança mensal. Cancele a qualquer momento.
        </p>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: "O plano Gratuito expira?",
    a: "Não. O plano Gratuito é permanente. Você pode usar o Formatio com 1 Grupo de formação e até 30 formandos por tempo indeterminado, sem cartão de crédito.",
  },
  {
    q: "O que é um 'Grupo de formação' no Formatio?",
    a: "Um Grupo de formação é um conjunto de pessoas dentro da sua comunidade que percorrerão um caminho formativo. Cada grupo de formação tem seus próprios formandos, formador responsável, plano formativo e grade de conteúdos.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Todos os dados são criptografados em trânsito (HTTPS/TLS) e em repouso. A plataforma é hospedada em infraestrutura redundante e está em conformidade com a LGPD.",
  },
  {
    q: "O que é a LGPD?",
    a: "A LGPD é a lei que protege os dados pessoais e estabelece regras para que empresas utilizem essas informações com segurança, transparência e responsabilidade. Estar em conformidade com a LGPD ajuda a aumentar a confiança dos clientes, fortalecer a credibilidade da marca, evitar riscos jurídicos e multas, além de demonstrar profissionalismo e compromisso com a proteção dos dados dos usuários. O Formatio foi desenvolvido desde o início com foco na conformidade com a LGPD, garantindo que os dados dos seus formandos estejam protegidos e que sua organização esteja em conformidade com a legislação brasileira de proteção de dados.",
  },
  {
    q: "Posso migrar meus dados de outra plataforma?",
    a: "Sim. O Formatio possui importação via arquivo e exportação completa de dados em JSON a qualquer momento. Você nunca fica preso na plataforma.",
  },
  {
    q: "Como funciona o upgrade de plano?",
    a: "Acesse Configurações → Plano na plataforma e escolha o plano desejado. A cobrança é mensal, proporcional ao dia da ativação, e pode ser cancelada a qualquer momento.",
  },
  {
    q: "Há suporte em português?",
    a: "Sim. Toda a plataforma, documentação e suporte são em português do Brasil. Nosso time de suporte responde por e-mail em até 24 horas nos dias úteis.",
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
              key={i}
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

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="bg-slate-950 py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Pronto para organizar sua comunidade?
          </h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">
            Crie sua conta gratuitamente em 2 minutos. Nenhum cartão de crédito necessário.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/registro"
              className="flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              Criar conta gratuita
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-3.5"
            >
              Já tenho uma conta →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-slate-950 border-t border-white/5 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center mb-3">
              <img src="/brand/formatio-horizontal-on-dark.svg" alt="Formatio" height={28} className="h-7 w-auto" />
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              Plataforma SaaS de gestão formativa para comunidades e organizações religiosas.
            </p>
          </div>

          {[
            {
              title: "Produto",
              links: [["Recursos", "#recursos"], ["Preços", "#precos"], ["FAQ", "#faq"]],
            },
            {
              title: "Conta",
              links: [["Entrar", "/login"], ["Criar conta", "/registro"]],
            },
            {
              title: "Legal",
              links: [["Privacidade", "/privacidade"], ["Termos de Uso", "/termos"]],
            },
          ].map(({ title, links }) => (
            <div key={title}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{title}</p>
              <ul className="space-y-2">
                {links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
          <p>© {year} Formatio. Todos os direitos reservados.</p>
          <p>Desenvolvido com ♥ para comunidades brasileiras.</p>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="font-sans antialiased">
      <Nav />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
