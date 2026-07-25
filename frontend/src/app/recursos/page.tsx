import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight, FileText, Compass, Users, BookOpen, Calendar,
  BellRing, Shield, Star, Check, Lock, Globe, Zap,
  ChevronRight, FileCheck, BookMarked, UserCheck, ClipboardList,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/structured-data";
import { marketingMeta } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Recursos",
  description:
    "Conheça todos os recursos da plataforma Formattio: Jornada Vocacional, avaliação nas 3 perspectivas, histórico do formando, controle de presença, comunicação e segurança LGPD.",
  ...marketingMeta({
    title: "Recursos — Formattio",
    description:
      "Tudo que sua comunidade precisa para acompanhar a jornada formativa dos seus membros com profundidade e rigor.",
    path: "/recursos",
  }),
};

const canonicalDocs = [
  { label: "Pedido de ingresso", icon: FileText },
  { label: "Avaliação de etapa", icon: FileCheck },
  { label: "Carta de apresentação", icon: BookMarked },
  { label: "Declaração de vida comunitária", icon: ClipboardList },
  { label: "Relatório de encerramento de etapa", icon: FileCheck },
  { label: "Atestado de participação", icon: UserCheck },
  { label: "Carta de recomendação canônica", icon: BookMarked },
  { label: "Declaração de saída voluntária", icon: FileText },
];

const features = [
  {
    icon: Compass,
    title: "Avaliação nas 3 perspectivas formativas",
    color: "bg-violet-500/10 text-violet-400",
    border: "border-violet-500/20",
    summary:
      "Acompanhe cada formando sob as dimensões Humana, Espiritual e Comunitária. Registre avaliações por encontro e visualize a evolução ao longo das etapas.",
    details: [
      { label: "Humana", desc: "Maturidade afetiva, autoconhecimento, equilíbrio emocional e crescimento integral da pessoa." },
      { label: "Espiritual", desc: "Vida de oração, intimidade com Deus, fidelidade sacramental e prática da lectio divina." },
      { label: "Comunitária", desc: "Vivência fraterna, comunhão, apostolado e capacidade de relação com a liderança." },
    ],
    extra: "As avaliações alimentam automaticamente os relatórios de encerramento de etapa e a Jornada Vocacional.",
  },
  {
    icon: Users,
    title: "Histórico completo do formando",
    color: "bg-blue-500/10 text-blue-400",
    border: "border-blue-500/20",
    summary:
      "Perfil rico com linha do tempo de eventos, nível formativo, anotações, documentos anexados e evolução de presença — tudo acessível e seguro.",
    details: [
      { label: "Perfil", desc: "Nome, data de nascimento, estado civil, contato, foto e documentos pessoais digitalizados." },
      { label: "Linha do tempo", desc: "Todos os marcos formativos registrados com data, responsável e descrição." },
      { label: "Progresso", desc: "Etapa atual, histórico de etapas anteriores e indicadores de avanço por dimensão." },
    ],
    extra: "Conformidade total com a LGPD: exportação de dados, direito ao esquecimento e controle de acesso por perfil.",
  },
  {
    icon: BookOpen,
    title: "Planos e grades formativas",
    color: "bg-indigo-500/10 text-indigo-400",
    border: "border-indigo-500/20",
    summary:
      "Estruture o conteúdo em eixos e etapas com retiros previstos. Crie grades reutilizáveis e associe planos a cada grupo com rastreabilidade de execução.",
    details: [
      { label: "Eixos formativos", desc: "Organize o conteúdo em eixos temáticos (humano, espiritual, comunitário, missionário)." },
      { label: "Grades reutilizáveis", desc: "Crie uma vez, aplique em múltiplos grupos. Atualize e as mudanças se propagam." },
      { label: "Rastreabilidade", desc: "Visualize o que foi executado, o que está pendente e o que foi pulado em cada grupo." },
    ],
    extra: "Retiros e eventos especiais podem ser agendados diretamente no plano formativo do grupo.",
  },
  {
    icon: Calendar,
    title: "Agenda e controle de presença",
    color: "bg-emerald-500/10 text-emerald-400",
    border: "border-emerald-500/20",
    summary:
      "Agende encontros, registre presenças por formando e acompanhe a frequência ao longo do tempo — base para os relatórios de encerramento de etapa.",
    details: [
      { label: "Agendamento", desc: "Crie encontros com data, hora, local e conteúdo previsto. Notificações automáticas para os participantes." },
      { label: "Lista de presença", desc: "Marque presença, ausência justificada ou ausência por formando a cada encontro." },
      { label: "Frequência", desc: "Acompanhe o percentual de presença de cada formando ao longo de uma etapa ou do ciclo completo." },
    ],
    extra: "O histórico de presença é usado na geração automática dos relatórios canônicos de encerramento.",
  },
  {
    icon: BellRing,
    title: "Comunicação proativa com formandos",
    color: "bg-pink-500/10 text-pink-400",
    border: "border-pink-500/20",
    summary:
      "Formandos e formadores recebem notificações sobre encontros, agendamentos e comunicados diretamente no dispositivo — sem depender de grupos de mensagem.",
    details: [
      { label: "Push sem app", desc: "Notificações chegam direto no celular via Web Push — sem precisar instalar nenhum aplicativo." },
      { label: "Avisos estruturados", desc: "Comunique datas, cancelamentos e comunicados com rastreabilidade de entrega." },
      { label: "Sem mistura", desc: "Informação da comunidade separada do grupo de WhatsApp — canal próprio, sério e rastreável." },
    ],
    extra: "Formandos podem ativar ou desativar notificações a qualquer momento, respeitando a LGPD.",
  },
  {
    icon: Shield,
    title: "Segurança e conformidade LGPD",
    color: "bg-teal-500/10 text-teal-400",
    border: "border-teal-500/20",
    summary:
      "Logs de auditoria completos, criptografia de campos sensíveis, exportação de dados, direito ao esquecimento e política de privacidade inclusa desde o primeiro dia.",
    details: [
      { label: "Criptografia", desc: "Dados em trânsito (HTTPS/TLS) e em repouso. Campos sensíveis com AES-256 em nível de campo." },
      { label: "Auditoria", desc: "Registro completo de quem acessou, criou, editou ou excluiu cada dado — com IP anonimizado." },
      { label: "Direitos LGPD", desc: "Exportação de dados em JSON, direito ao esquecimento e controle de acesso por perfil (RBAC)." },
    ],
    extra: "Hospedagem em infraestrutura redundante no Brasil. Conformidade desde o primeiro commit.",
  },
];

const trustItems = [
  { icon: Lock, label: "Dados criptografados em trânsito e em repouso" },
  { icon: Shield, label: "Conformidade com a LGPD" },
  { icon: Globe, label: "Hospedagem redundante no Brasil" },
  { icon: Zap, label: "30 dias de experiência sem cartão de crédito" },
];

export default function RecursosPage() {
  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <JsonLd
        data={breadcrumbLd([
          { name: "Início", path: "/" },
          { name: "Recursos", path: "/recursos" },
        ])}
      />
      <MarketingNav />

      {/* Hero */}
      <section className="relative bg-slate-950 pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
            <Zap className="h-3 w-3" />
            Recursos
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight tracking-tight mb-6">
            Tudo que sua comunidade precisa,{" "}
            <span className="bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              integrado e seguro
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Uma plataforma construída para a realidade das comunidades formativas brasileiras —
            do primeiro contato à formação permanente, com rigor canônico e conformidade com a LGPD.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/registro"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
            >
              Começar período de experiência
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

      {/* Trust bar */}
      <section className="bg-slate-900 border-y border-white/5 py-5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustItems.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-slate-400">
                <Icon className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Jornada Vocacional — destaque */}
      <section className="bg-slate-950 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Recurso exclusivo</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Jornada Vocacional e documentos eclesiásticos
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Para comunidades com processos canônicos formais: geração automática de documentos PDF
              exigidos pelo direito canônico, com fluxo de aprovação integrado.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
            <div className="p-7 md:p-10">
              <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">
                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium mb-4">
                    <Star className="h-3 w-3" />
                    Exclusivo para Novas Comunidades e Institutos Religiosos
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">
                    Do candidato à progressão canônica — tudo registrado e documentado
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6">
                    O direito canônico exige que institutos religiosos e novas comunidades mantenham
                    documentação formal da jornada de seus membros. O Formattio automatiza a geração
                    desses documentos a partir dos dados já cadastrados no sistema — sem retrabalho,
                    sem papel perdido, com trilha auditável completa.
                  </p>

                  {/* Workflow visual */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {[
                      { num: "01", title: "Candidato ingressa", desc: "Pedido de ingresso gerado automaticamente com dados do formulário." },
                      { num: "02", title: "Avaliação por etapa", desc: "Formador registra avaliação H/E/C. Documento de encerramento é gerado." },
                      { num: "03", title: "Progressão documentada", desc: "Cartas, declarações e atestados gerados em um clique, prontos para assinar." },
                    ].map(({ num, title, desc }) => (
                      <div key={num} className="rounded-xl bg-amber-500/5 border border-amber-500/15 p-4">
                        <span className="text-2xl font-bold text-amber-500/40">{num}</span>
                        <p className="text-sm font-semibold text-white mt-1 mb-1">{title}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Docs list */}
                <div className="shrink-0 md:w-64">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">
                    8 tipos de documentos gerados
                  </p>
                  <ul className="space-y-2">
                    {canonicalDocs.map(({ label, icon: Icon }) => (
                      <li key={label} className="flex items-center gap-2.5 text-sm text-slate-300">
                        <div className="flex-none h-6 w-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                          <Icon className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-slate-900 border-t border-white/5 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">Módulos da plataforma</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Cada recurso pensado para o processo formativo
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Todos os módulos estão disponíveis em todos os planos. Sem recursos travados por nível.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, color, border, summary, details, extra }) => (
              <div
                key={title}
                className={`rounded-2xl border border-white/10 bg-slate-800/30 p-6 hover:border-white/20 transition-colors`}
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-5">{summary}</p>

                <div className={`rounded-xl border ${border} bg-white/[0.02] p-4 space-y-3`}>
                  {details.map(({ label, desc }) => (
                    <div key={label} className="flex gap-3">
                      <div className="flex-none mt-0.5">
                        <Check className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-300">{label} — </span>
                        <span className="text-xs text-slate-400">{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {extra && (
                  <p className="mt-3 text-xs text-slate-500 leading-relaxed">{extra}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-slate-950 py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Pronto para organizar a jornada formativa da sua comunidade?
            </h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Explore o Formattio por 30 dias com acesso completo a todos os recursos. Sem cartão de crédito.
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
                href="/para-quem-e"
                className="inline-flex items-center gap-2 px-6 py-3.5 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white rounded-xl transition-colors text-sm"
              >
                Ver para quem é
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
