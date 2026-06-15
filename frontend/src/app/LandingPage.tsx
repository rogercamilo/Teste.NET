"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users, BookOpen, Calendar,
  Check, ChevronDown, ChevronRight, Menu, X, ArrowRight,
  Lock, Shield, Zap, Globe, Star,
  Bell, BellOff, CheckCircle2, Loader2,
  Archive, FileWarning, Network, MessageSquare,
  FileText, Compass, BellRing, Building2, Heart, BookMarked, GraduationCap,
} from "lucide-react";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

// ── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ isNewOrg }: { isNewOrg: boolean }) {
  const [open, setOpen] = useState(false);
  const navLinks = [
    ["Recursos", "/recursos"],
    ["Para quem é", "/para-quem-e"],
    ["Preços", "/precos"],
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
          {isNewOrg ? (
            <Link href="/registro" className="text-sm font-medium bg-white text-slate-950 hover:bg-slate-100 transition-colors px-4 py-2 rounded-lg">
              Cadastre-se
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-medium bg-white text-slate-950 hover:bg-slate-100 transition-colors px-4 py-2 rounded-lg">
              Fazer Login
            </Link>
          )}
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
            {isNewOrg ? (
              <Link href="/registro" className="text-sm font-medium bg-white text-slate-950 text-center px-4 py-2 rounded-lg">
                Cadastre-se
              </Link>
            ) : (
              <Link href="/login" className="text-sm font-medium bg-white text-slate-950 text-center px-4 py-2 rounded-lg">
                Fazer Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ isNewOrg }: { isNewOrg: boolean }) {
  return (
    <section className="relative min-h-screen bg-slate-950 flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 pt-32 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-8">
          <Zap className="h-3 w-3" />
          Período de experiência de 30 dias · Sem cartão de crédito
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight tracking-tight mb-6">
          Chega de planilhas.{" "}
          <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            Acompanhe a jornada formativa dos seus membros com a profundidade que ela merece.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Grupos de formação, planos formativos, controle de presenças, avaliação nas dimensões Humana,
          Espiritual e Comunitária — e geração automática de documentos eclesiásticos. Tudo integrado,
          seguro e em conformidade com a LGPD.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {isNewOrg ? (
            <Link
              href="/registro"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
            >
              Cadastre-se gratuitamente
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
            >
              Fazer Login
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <a
            href="#recursos"
            className="flex items-center gap-2 px-6 py-3 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
          >
            Ver recursos
          </a>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          {isNewOrg
            ? "Período de experiência de 30 dias com acesso completo. Sem cartão de crédito."
            : "Entre com suas credenciais para acessar a plataforma."}
        </p>

        {/* Dashboard preview */}
        <div className="mt-16 relative mx-auto max-w-4xl">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10">
              {["bg-red-500", "bg-yellow-500", "bg-green-500"].map((c, i) => (
                <div key={i} className={`h-2.5 w-2.5 rounded-full ${c}`} />
              ))}
              <div className="ml-3 text-xs text-slate-500 bg-slate-800 rounded px-3 py-1">
                www.formattio.com.br
              </div>
            </div>
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Formandos", value: "142", color: "text-blue-400" },
                { label: "Presenças", value: "94%", color: "text-emerald-400" },
                { label: "Grupos de formação", value: "5", color: "text-amber-400" },
                { label: "Documentos gerados", value: "38", color: "text-violet-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl bg-slate-800/60 p-4 border border-white/5">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 grid grid-cols-3 gap-3">
              {["Postulantado", "Discipulado", "Primeiras Promessas"].map((nivel, i) => (
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
    { icon: Lock, label: "Dados criptografados em trânsito e em repouso" },
    { icon: Shield, label: "Conformidade com a LGPD" },
    { icon: Globe, label: "Hospedagem redundante no Brasil" },
    { icon: BookOpen, label: "Jornada Vocacional integrada" },
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

// ── Pain Points ───────────────────────────────────────────────────────────────

const painPoints = [
  {
    icon: Archive,
    title: "Sua instituição provavelmente não tem um histórico formativo confiável",
    desc: "Não é descuido — é ausência de estrutura de governança. Quando o formador muda, o contexto formativovai junto. A instituição opera sem memória histórica e, com o tempo, nem percebe que isso é um problema.",
  },
  {
    icon: FileWarning,
    title: "A maioria das instituições não sabe que precisa manter registros formais",
    desc: "O direito canônico exige que novas comunidades e institutos religiosos mantenham documentação formal da jornada de seus membros. Na prática, pouquíssimas estão em conformidade — e muitas nunca souberam que precisariam estar. Essa é uma providência que precisa ser tomada.",
  },
  {
    icon: Network,
    title: "Formação vocacional, permanente, cursos — como está o andamento de cada um?",
    desc: "Se a resposta depende de perguntar individualmente a cada formador, não há visão gerencial. Dados dos grupos, documentos e registros de marcos formativos existem em de forma inadequada e separadas — quando existem. Sem visibilidade consolidada e uma trilha auditável, é impossível gerir o processo formativo com seriedade institucional.",
  },
  {
    icon: MessageSquare,
    title: "Avisos e comunicados circulam por grupos de mensagem sem estrutura",
    desc: "Misturados com conversas do dia a dia, sem registro e sem garantia de que a informação chegou a quem precisava. A comunicação da comunidade merece a mesma seriedade que o restante do processo formativo.",
  },
];

function PainPoints() {
  return (
    <section className="bg-slate-900 border-b border-white/5 py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">O cenário atual</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Você reconhece esse cenário?
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A maioria das instituições formativas opera sem perceber essas lacunas — até o momento em que elas se tornam urgentes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {painPoints.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-5 rounded-2xl border border-white/8 bg-slate-800/30 p-6">
              <div className="shrink-0 mt-0.5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-2 leading-snug">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

const regularFeatures = [
  {
    icon: Compass,
    title: "Avaliação nas 3 perspectivas formativas",
    desc: "Acompanhe cada formando sob as dimensões Humana, Espiritual e Comunitária. Registre avaliações por encontro e visualize a evolução ao longo das etapas no dashboard do grupo.",
    color: "bg-violet-500/10 text-violet-400",
  },
  {
    icon: Users,
    title: "Histórico completo do formando",
    desc: "Cadastro rico com linha do tempo de eventos, nível formativo, anotações, documentos anexados e evolução de presença — tudo acessível e seguro a qualquer momento.",
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Planos e grades formativas",
    desc: "Estruture o conteúdo em eixos e etapas com retiros previstos. Crie grades reutilizáveis e associe planos formativos a cada grupo com rastreabilidade de execução.",
    color: "bg-indigo-500/10 text-indigo-400",
  },
  {
    icon: Calendar,
    title: "Agenda e controle de presença",
    desc: "Agende encontros, registre presenças por formando e acompanhe a frequência ao longo do tempo — base de dados para os relatórios de encerramento de etapa.",
    color: "bg-emerald-500/10 text-emerald-400",
  },
  {
    icon: BellRing,
    title: "Comunicação proativa com formandos",
    desc: "Formandos e formadores recebem notificações sobre encontros, agendamentos e comunicados diretamente no dispositivo — sem depender de grupos de mensagem. Informação certa, na hora certa.",
    color: "bg-pink-500/10 text-pink-400",
  },
  {
    icon: Shield,
    title: "Segurança e conformidade",
    desc: "Logs de auditoria completos, criptografia de campos sensíveis, exportação de dados, direito ao esquecimento (LGPD) e política de privacidade inclusa desde o primeiro dia.",
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
            Uma plataforma completa para acompanhar a jornada formativa dos seus membros — do primeiro contato à formação permanente.
          </p>
        </div>

        {/* Hero feature — Jornada Vocacional */}
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-7 mb-6">
          <div className="flex flex-col md:flex-row md:items-start gap-5">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
              <FileText className="h-6 w-6 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-3">
                <Star className="h-3 w-3" />
                Exclusivo para Nova Comunidades e Institutos Religiosos
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Jornada Vocacional e documentos eclesiásticos
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Para comunidades com processos canônicos formais: geração automática de 8 tipos de documentos PDF — pedidos de ingresso, avaliações de etapa, cartas de apresentação e declarações. Fluxo de
                aprovação por estágio, anexos digitalizados, livro registro e rastreabilidade completa para auditoria.
              </p>
            </div>
          </div>
        </div>

        {/* Regular features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularFeatures.map(({ icon: Icon, title, desc, color }) => (
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

// ── Para quem é ───────────────────────────────────────────────────────────────

const orgTypes = [
  {
    type: "Nova Comunidade",
    title: "Formação vocacional estruturada",
    borderClass: "border-t-amber-500",
    iconClass: "bg-amber-500/10 text-amber-400",
    icon: Building2,
    features: [
      "Jornada Vocacional com documentos canônicos",
      "Etapas formativas e progressão estruturada",
      "Avaliação nas 3 perspectivas (H/E/C)",
      "Conformidade com o direito canônico",
    ],
  },
  {
    type: "Grupo de Oração",
    title: "Encontros livres, gestão simples",
    borderClass: "border-t-blue-500",
    iconClass: "bg-blue-500/10 text-blue-400",
    icon: Heart,
    features: [
      "Grupos de formação de modo livre",
      "Registro de presenças por encontro",
      "Eventos especiais: retiros, vigílias, missões",
      "Comunicação direta com os membros",
    ],
  },
  {
    type: "Instituto Religioso",
    title: "Rigor canônico em escala",
    borderClass: "border-t-violet-500",
    iconClass: "bg-violet-500/10 text-violet-400",
    icon: BookMarked,
    features: [
      "Formação estruturada com múltiplos grupos",
      "Documentos canônicos integrados",
      "Visão gerencial consolidada do Instituto",
      "Trilha auditável para a coordenação",
    ],
  },
  {
    type: "Centro Formativo",
    title: "Cursos e formações abertas",
    borderClass: "border-t-emerald-500",
    iconClass: "bg-emerald-500/10 text-emerald-400",
    icon: GraduationCap,
    features: [
      "Grades de conteúdo reutilizáveis",
      "Múltiplas turmas simultâneas",
      "Controle de participação e frequência",
      "Histórico de cada participante",
    ],
  },
];

function ParaQuemE() {
  return (
    <section id="para-quem-e" className="bg-slate-950 py-24 border-t border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Para quem é</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Uma plataforma para cada tipo de organização formativa
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Da comunidade de vida ao centro de formação: o Formattio se adapta ao modelo formativo da sua instituição.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orgTypes.map(({ type, title, borderClass, iconClass, icon: Icon, features }) => (
            <div
              key={type}
              className={`rounded-2xl border-t-2 border border-white/10 bg-slate-900/60 p-6 ${borderClass}`}
            >
              <div className="flex items-start gap-4 mb-5">
                <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest mb-0.5">{type}</p>
                  <h3 className="text-base font-semibold text-white">{title}</h3>
                </div>
              </div>
              <ul className="space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-400">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
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
      title: "Configure sua organização",
      desc: "Cadastre sua comunidade, defina o tipo de instituição, crie os Grupos de Formação e convide os formadores responsáveis por e-mail — tudo em menos de 10 minutos.",
    },
    {
      number: "02",
      title: "Defina a jornada formativa",
      desc: "Monte Planos Formativos com eixos e etapas, crie Grades de Formação com os conteúdos detalhados e associe cada grade ao grupo correspondente.",
    },
    {
      number: "03",
      title: "Acompanhe e documente",
      desc: "Registre presenças, avalie cada formando nas 3 perspectivas, avance etapas e gere automaticamente os documentos eclesiásticos e relatórios de encerramento.",
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

const PLANOS_PAGOS = [
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

function Pricing() {
  const [anual, setAnual] = useState(false);
  const [expandido, setExpandido] = useState(false);

  return (
    <section id="precos" className="bg-slate-950 py-24">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Preços</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Planos para cada tamanho de comunidade
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Comece sem compromisso. Escale conforme sua comunidade cresce. Sem taxas ocultas.
          </p>
        </div>

        {/* Toggle mensal/anual */}
        <div className="flex justify-center mb-10">
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
          <p className="text-center text-xs text-emerald-400 font-medium -mt-7 mb-10">
            Equivale a 2 meses grátis por ano
          </p>
        )}

        {/* Cards BASICO / INTERMEDIARIO / AVANCADO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {PLANOS_PAGOS.map((plan) => (
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

        {/* Card Personalizado */}
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

            {/* Calculadora expansível */}
            {expandido && (
              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-sm font-medium text-slate-300 mb-4">
                  Arraste para indicar o número de membros ativos da sua organização:
                </p>
                <LandingCalculator />
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Preços em reais. Cancele a qualquer momento. Plano anual cobrado em parcela única.
        </p>
      </div>
    </section>
  );
}

function LandingCalculator() {
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
  function calcAnualTotal(u: number)  { return Math.round(calcMensal(u) * 12 * 0.83); }
  function calcStorage(u: number)     { return Math.ceil((u * 25 * 3) / 1024); }

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
          type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={SLIDER_STEP} value={usuarios}
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

// ── FAQ ───────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: "Quais tipos de comunidade o Formattio atende?",
    a: "O Formattio atende Nova Comunidades, Grupos de Oração, Institutos Religiosos e Centros Formativos. Cada tipo tem configuração padrão adequada ao seu modelo, mas você pode personalizar conforme a realidade da sua instituição.",
  },
  {
    q: "O que é a Jornada Vocacional no Formattio?",
    a: "É o módulo de acompanhamento processual canônico, disponível para Nova Comunidades e Institutos Religiosos. Ele gerencia o fluxo de aprovação de cada etapa do percurso vocacional e gera automaticamente 8 tipos de documentos PDF exigidos pelo direito canônico — pedidos de ingresso, avaliações, cartas de apresentação, declarações e outros — com base nos dados já cadastrados no sistema.",
  },
  {
    q: "O que são as 3 perspectivas formativas?",
    a: "São as três dimensões de avaliação de cada formando: Humana (maturidade, autoconhecimento, crescimento integral), Espiritual (vida de oração, intimidade com Deus, sacramental) e Comunitária (vivência fraterna, comunhão, apostolado). O Formattio permite registrar e acompanhar a evolução em cada dimensão ao longo das etapas, alimentando os relatórios de encerramento.",
  },
  {
    q: "O que é um 'Grupo de Formação' no Formattio?",
    a: "Um Grupo de Formação é um conjunto de pessoas dentro da sua comunidade que percorrerão um caminho formativo juntas. Cada grupo tem seus próprios formandos, formador responsável, plano formativo e grade de conteúdos. Grupos podem ser estruturados (com etapas e progressão canônica) ou livres (para encontros, cursos ou aprofundamentos).",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Todos os dados são criptografados em trânsito (HTTPS/TLS) e em repouso. Campos sensíveis têm criptografia adicional em nível de campo (AES-256). A plataforma é hospedada em infraestrutura redundante no Brasil e está em conformidade com a LGPD.",
  },
  {
    q: "O que é a LGPD e por que isso importa para minha comunidade?",
    a: "A LGPD (Lei Geral de Proteção de Dados) é a legislação brasileira que regula o uso de dados pessoais. Comunidades que cadastram membros — com nome, endereço, documentos e histórico pessoal — estão sujeitas à LGPD. O Formattio foi construído desde o início com conformidade em mente: logs de auditoria, exportação de dados, direito ao esquecimento e política de privacidade inclusa.",
  },
  {
    q: "Posso migrar meus dados de outra plataforma?",
    a: "Sim. O Formattio possui importação via arquivo e exportação completa dos dados da sua organização em JSON a qualquer momento. Você nunca fica preso na plataforma.",
  },
  {
    q: "Como funciona o período de experiência e o upgrade de plano?",
    a: "Ao criar sua conta, você tem 30 dias de acesso completo à plataforma — é o seu período de experiência, sem cartão de crédito. Ao final, escolha o plano que melhor se adapta ao tamanho da sua comunidade em Configurações → Plano. A cobrança é mensal ou anual, e pode ser cancelada a qualquer momento.",
  },
  {
    q: "Há suporte em português?",
    a: "Sim. Toda a plataforma, documentação e suporte são em português do Brasil. Nosso time responde por e-mail em até 24 horas nos dias úteis.",
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

// ── Push Subscribe ────────────────────────────────────────────────────────────

function PushSubscribeSection() {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushSubscription();

  if (!isSupported) return null;

  return (
    <section id="notificacoes" className="bg-slate-900 border-t border-white/5 py-20">
      <div className="max-w-2xl mx-auto px-4 text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6">
          <Bell className="h-6 w-6 text-primary" />
        </div>

        <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
          Notificações
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
          Fique por dentro dos encontros da sua comunidade
        </h2>
        <p className="text-slate-400 mb-8 max-w-lg mx-auto text-sm leading-relaxed">
          Ative as notificações e receba avisos diretamente no seu celular sobre formações,
          datas e comunicados — mesmo com o navegador fechado, sem instalar nenhum aplicativo.
        </p>

        {isSubscribed ? (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Notificações ativas neste dispositivo</span>
            </div>
            <div>
              <button
                onClick={unsubscribe}
                disabled={isLoading}
                className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-400 transition-colors mt-1"
              >
                {isLoading
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <BellOff className="h-3 w-3" />
                }
                Desativar notificações neste dispositivo
              </button>
            </div>
          </div>
        ) : permission === "denied" ? (
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-slate-800 border border-white/10 text-slate-400">
            <BellOff className="h-5 w-5 shrink-0" />
            <span className="text-sm">
              Notificações bloqueadas. Ative nas configurações do navegador.
            </span>
          </div>
        ) : (
          <button
            onClick={subscribe}
            disabled={isLoading}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            {isLoading ? "Ativando…" : "Ativar notificações"}
          </button>
        )}

        <p className="mt-6 text-xs text-slate-600">
          Sem spam. Apenas avisos da sua comunidade. Cancele a qualquer momento.
        </p>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCTA({ isNewOrg }: { isNewOrg: boolean }) {
  return (
    <section className="bg-slate-950 py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-12">
          {isNewOrg ? (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Pronto para organizar a jornada formativa da sua comunidade?
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Crie sua conta e explore o Formattio por 30 dias, com acesso completo. Sem cartão de crédito.
              </p>
              <Link href="/registro" className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm">
                Cadastre-se gratuitamente
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Bem-vindo(a) de volta
              </h2>
              <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                Entre com suas credenciais para continuar a jornada formativa da sua comunidade.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm">
                Fazer Login
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage({ isNewOrg }: { isNewOrg: boolean }) {
  return (
    <div className="font-sans antialiased">
      <Nav isNewOrg={isNewOrg} />
      <Hero isNewOrg={isNewOrg} />
      <TrustBar />
      <PainPoints />
      <Features />
      <ParaQuemE />
      <HowItWorks />
      <Pricing />
      <FAQ />
      <PushSubscribeSection />
      <FinalCTA isNewOrg={isNewOrg} />
      <MarketingFooter />
    </div>
  );
}
