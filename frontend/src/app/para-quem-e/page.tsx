import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, Building2, Heart, BookMarked, GraduationCap,
  Check, Minus, ChevronRight,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export const metadata: Metadata = {
  title: "Para quem é — Formattio",
  description:
    "O Formattio atende Novas Comunidades, Institutos Religiosos, Grupos de Oração e Centros Formativos. Conheça o perfil de cada organização e como a plataforma se adapta ao seu modelo.",
  openGraph: {
    title: "Para quem é — Formattio",
    description:
      "Da nova comunidade ao centro de formação: uma plataforma que se adapta ao modelo formativo da sua instituição.",
    type: "website",
    locale: "pt_BR",
  },
};

const orgTypes = [
  {
    id: "nova-comunidade",
    type: "Nova Comunidade",
    title: "Formação vocacional estruturada e conformidade canônica",
    icon: Building2,
    iconClass: "bg-amber-500/10 text-amber-400",
    borderClass: "border-t-amber-500",
    accentClass: "text-amber-400",
    badgeBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    context:
      "Novas Comunidades são organismos eclesiais reconhecidos pelo direito canônico que vivem um processo formal de discernimento vocacional. Seus membros percorrem etapas progressivas — postulantado, noviciado, primeiras promessas — cada uma com avaliações formais e documentação obrigatória.",
    differentiator:
      "O Formattio é o único sistema que automatiza a geração dos documentos canônicos exigidos pela Santa Sé e pelas dioceses, com trilha auditável completa para processos de reconhecimento.",
    features: [
      "Jornada Vocacional com fluxo de aprovação por etapa",
      "Geração automática de 8 tipos de documentos canônicos em PDF",
      "Avaliação nas 3 perspectivas (Humana, Espiritual, Comunitária)",
      "Livro Registro digital com trilha auditável",
      "Controle de etapas progressivas e progressão formal",
      "Conformidade com o direito canônico e exigências diocesanas",
    ],
  },
  {
    id: "instituto-religioso",
    type: "Instituto Religioso",
    title: "Rigor canônico em escala, com visão gerencial consolidada",
    icon: BookMarked,
    iconClass: "bg-violet-500/10 text-violet-400",
    borderClass: "border-t-violet-500",
    accentClass: "text-violet-400",
    badgeBg: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    context:
      "Institutos de vida consagrada — congregações, ordens religiosas, institutos seculares — operam com múltiplos grupos de formação, frequentemente em diferentes casas ou regiões. A coordenação central precisa de visibilidade consolidada sem perder o detalhe de cada grupo.",
    differentiator:
      "Visão gerencial unificada de todos os grupos e formandos do instituto, com permissões por casa e rastreabilidade canônica para a coordenação central.",
    features: [
      "Múltiplos grupos de formação gerenciados centralmente",
      "Visão gerencial consolidada: todos os formandos do instituto",
      "Documentos canônicos integrados ao fluxo de formação",
      "Controle de acesso por casa ou comunidade",
      "Trilha auditável para a coordenação e superiores",
      "Exportação de dados para relatórios à autoridade eclesiástica",
    ],
  },
  {
    id: "grupo-de-oracao",
    type: "Grupo de Oração",
    title: "Encontros livres, gestão simples e comunicação eficiente",
    icon: Heart,
    iconClass: "bg-blue-500/10 text-blue-400",
    borderClass: "border-t-blue-500",
    accentClass: "text-blue-400",
    badgeBg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    context:
      "Grupos de oração, movimentos leigos e comunidades de partilha não têm processo vocacional formal, mas têm uma vida comunitária real que merece registro e organização. Sem burocracia canônica, mas com estrutura suficiente para crescer com saúde.",
    differentiator:
      "Modo de formação livre — sem etapas obrigatórias ou documentos canônicos — com foco em presença, eventos e comunicação direta com os membros.",
    features: [
      "Grupos de formação no modo livre (sem etapas fixas)",
      "Registro de presenças por encontro",
      "Agenda de eventos: retiros, vigílias, missões, celebrações",
      "Comunicação push direta com os membros",
      "Histórico de participação de cada membro",
      "Sem complexidade canônica desnecessária",
    ],
  },
  {
    id: "centro-formativo",
    type: "Centro Formativo",
    title: "Cursos e formações abertas, múltiplas turmas simultâneas",
    icon: GraduationCap,
    iconClass: "bg-emerald-500/10 text-emerald-400",
    borderClass: "border-t-emerald-500",
    accentClass: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    context:
      "Centros de formação leiga, escolas de evangelização e institutos de teologia oferecem cursos com matrículas abertas, turmas por ano ou semestre e participantes com perfis muito distintos. A gestão exige controle de turmas, grades reutilizáveis e histórico individual.",
    differentiator:
      "Grades curriculares reutilizáveis que podem ser aplicadas a múltiplas turmas simultaneamente, com controle individual de participação e histórico por participante.",
    features: [
      "Grades de conteúdo reutilizáveis entre turmas",
      "Múltiplas turmas simultâneas do mesmo curso",
      "Controle individual de participação e frequência",
      "Histórico completo de cada participante",
      "Comunicação segmentada por turma ou curso",
      "Relatórios de encerramento por ciclo ou semestre",
    ],
  },
];

const comparisonRows = [
  {
    label: "Jornada Vocacional",
    hint: "Fluxo canônico por etapas",
    vals: ["sim", "sim", "nao", "nao"],
  },
  {
    label: "Documentos canônicos (PDF)",
    hint: "8 tipos gerados automaticamente",
    vals: ["sim", "sim", "nao", "nao"],
  },
  {
    label: "Grupos estruturados",
    hint: "Com etapas e progressão formal",
    vals: ["sim", "sim", "nao", "opcional"],
  },
  {
    label: "Grupos livres",
    hint: "Sem etapas, foco em presença",
    vals: ["opcional", "opcional", "sim", "sim"],
  },
  {
    label: "Avaliação H/E/C",
    hint: "Nas 3 perspectivas formativas",
    vals: ["sim", "sim", "opcional", "opcional"],
  },
  {
    label: "Grades curriculares",
    hint: "Reutilizáveis entre turmas",
    vals: ["sim", "sim", "sim", "sim"],
  },
  {
    label: "Comunicação push",
    hint: "Notificações sem WhatsApp",
    vals: ["sim", "sim", "sim", "sim"],
  },
  {
    label: "Visão multi-grupo",
    hint: "Gestão consolidada",
    vals: ["opcional", "sim", "nao", "sim"],
  },
];

function ComparisonCell({ val }: { val: string }) {
  if (val === "sim") return (
    <div className="flex justify-center">
      <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      </div>
    </div>
  );
  if (val === "nao") return (
    <div className="flex justify-center">
      <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center">
        <Minus className="h-3.5 w-3.5 text-slate-600" />
      </div>
    </div>
  );
  return (
    <div className="flex justify-center">
      <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center">
        <span className="text-[9px] font-bold text-amber-400">OPC</span>
      </div>
    </div>
  );
}

const colHeaders = [
  { label: "Nova\nComunidade", color: "text-amber-400" },
  { label: "Instituto\nReligioso", color: "text-violet-400" },
  { label: "Grupo de\nOração", color: "text-blue-400" },
  { label: "Centro\nFormativo", color: "text-emerald-400" },
];

export default function ParaQuemEPage() {
  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="relative bg-slate-950 pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
            Para quem é
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Uma plataforma para{" "}
            <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              cada modelo formativo
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Do processo vocacional canônico ao curso aberto: o Formattio se adapta à realidade
            e ao modelo formativo da sua organização — sem forçar um molde único para realidades diferentes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/registro"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
            >
              Começar gratuitamente
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/precos"
              className="flex items-center gap-2 px-6 py-3 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
            >
              Ver planos e preços
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Org type cards */}
      <section className="bg-slate-950 py-12">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          {orgTypes.map(({ id, type, title, icon: Icon, iconClass, borderClass, accentClass, badgeBg, context, differentiator, features }) => (
            <div
              key={id}
              className={`rounded-2xl border-t-2 border border-white/10 bg-slate-900/60 p-7 md:p-10 ${borderClass}`}
            >
              <div className="flex flex-col md:flex-row md:items-start gap-8">
                {/* Left: context + differentiator */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-widest ${accentClass}`}>{type}</p>
                      <h2 className="text-lg font-bold text-white leading-snug">{title}</h2>
                    </div>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed mb-5">{context}</p>

                  <div className={`rounded-xl border px-4 py-3 text-sm ${badgeBg} bg-opacity-10`}>
                    <span className="font-semibold">Diferencial: </span>
                    {differentiator}
                  </div>
                </div>

                {/* Right: feature list */}
                <div className="shrink-0 md:w-72">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
                    O que o Formattio oferece
                  </p>
                  <ul className="space-y-2.5">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    <Link
                      href="/registro"
                      className={`inline-flex items-center gap-2 text-sm font-medium ${accentClass} hover:opacity-80 transition-opacity`}
                    >
                      Começar como {type}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-slate-900 border-t border-white/5 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Comparativo</p>
            <h2 className="text-3xl font-bold text-white mb-4">
              Qual tipo de organização você é?
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Use a tabela abaixo para identificar quais recursos fazem sentido para o seu modelo formativo.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-slate-800/50">
                  <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-widest w-[35%]">
                    Recurso
                  </th>
                  {colHeaders.map(({ label, color }) => (
                    <th
                      key={label}
                      className={`px-3 py-4 text-center text-xs font-semibold uppercase tracking-widest whitespace-pre-line ${color}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comparisonRows.map(({ label, hint, vals }) => (
                  <tr key={label} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
                    </td>
                    {vals.map((v, i) => (
                      <td key={i} className="px-3 py-4">
                        <ComparisonCell val={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 justify-center text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-2.5 w-2.5 text-emerald-400" />
              </div>
              Incluído
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-amber-500/10 flex items-center justify-center">
                <span className="text-[8px] font-bold text-amber-400">OPC</span>
              </div>
              Opcional / configurável
            </span>
            <span className="flex items-center gap-1.5">
              <div className="h-4 w-4 rounded-full bg-white/5 flex items-center justify-center">
                <Minus className="h-2.5 w-2.5 text-slate-600" />
              </div>
              Não aplicável
            </span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-950 py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Encontrou o perfil da sua organização?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Cadastre-se e explore o Formattio por 30 dias com acesso completo. Configure a plataforma
              para o seu modelo formativo e veja como ela se adapta à sua realidade.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/registro"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
              >
                Cadastre-se gratuitamente
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/recursos"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white rounded-xl transition-colors text-sm"
              >
                Ver todos os recursos
              </Link>
            </div>
            <p className="mt-5 text-xs text-slate-500">
              30 dias de acesso completo · Sem cartão de crédito · Cancele a qualquer momento
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
