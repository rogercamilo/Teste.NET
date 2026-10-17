"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useReducedMotion,
  type Variants,
} from "motion/react";
import {
  Network,
  FileWarning,
  BellRing,
  FileText,
  Archive,
  Compass,
  CheckCircle2,
  HeartHandshake,
  GraduationCap,
  Clock,
  BookMarked,
  Shield,
  Heart,
  ArrowRight,
  ArrowDown,
  ChevronDown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

// ── Reveal on scroll (respeita prefers-reduced-motion) ───────────────────────
function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

// ── Dados ────────────────────────────────────────────────────────────────────

const DORES: { icon: LucideIcon; titulo: string; texto: string }[] = [
  {
    icon: Network,
    titulo: "Tudo espalhado",
    texto: "Caderno, planilha, grupo de WhatsApp e memória. A informação da formação nunca está num lugar só.",
  },
  {
    icon: FileWarning,
    titulo: "A memória vai embora",
    texto: "Quando um formador sai, leva na cabeça o histórico de cada pessoa. A próxima equipe recomeça do zero.",
  },
  {
    icon: BellRing,
    titulo: "Você descobre tarde",
    texto: "Só percebe que alguém se afastou quando a pessoa já parou de aparecer — e aí é tarde para acolher.",
  },
  {
    icon: FileText,
    titulo: "Relatório no sufoco",
    texto: "Prestar contas vira uma madrugada juntando presença, etapas e observações na mão.",
  },
  {
    icon: Archive,
    titulo: "Documento solto é risco",
    texto: "Atas e registros em arquivos avulsos — fáceis de perder, difíceis de provar quando a casa pede.",
  },
];

const MOMENTOS: {
  etiqueta: string;
  icon: LucideIcon;
  titulo: string;
  antes: string;
  solucao: string;
  ganho: string;
}[] = [
  {
    etiqueta: "De manhã",
    icon: Compass,
    titulo: "Você abre o painel e sabe o que importa hoje",
    antes: "Antes: começar o dia sem saber o que priorizar.",
    solucao:
      "A Minha Semana reúne encontros, pendências e quem precisa de atenção — tudo na primeira tela.",
    ganho: "Começa o dia com clareza, não no escuro.",
  },
  {
    etiqueta: "No encontro",
    icon: CheckCircle2,
    titulo: "A presença se registra sozinha",
    antes: "Antes: lista no papel, digitada depois (quando dava tempo).",
    solucao:
      "Chamada assistida pelo RSVP do portal e pelo diário — a frequência fica pronta na hora.",
    ganho: "Frequência confiável, sem retrabalho.",
  },
  {
    etiqueta: "No acompanhamento",
    icon: HeartHandshake,
    titulo: "A história de cada pessoa num lugar só",
    antes: "Antes: o histórico morava na cabeça de quem acompanhava.",
    solucao:
      "Ficha, jornada formativa e conversas 1:1 ficam juntas — e continuam ali quando a equipe muda.",
    ganho: "Nada se perde, nem na troca de formador.",
  },
  {
    etiqueta: "Um sinal de risco",
    icon: BellRing,
    titulo: "Você percebe antes de perder",
    antes: "Antes: a ausência só aparecia quando já era despedida.",
    solucao:
      "A plataforma sinaliza quem está se afastando pela presença e pelo engajamento.",
    ganho: "Dá para acolher a tempo, com cuidado.",
  },
  {
    etiqueta: "Ao avançar uma etapa",
    icon: GraduationCap,
    titulo: "Formação com critério e registro",
    antes: "Antes: avançar etapa era decisão de memória, sem rastro.",
    solucao:
      "Cada etapa tem seus requisitos, avaliações e observações registrados na jornada.",
    ganho: "Decisões justas — e documentadas.",
  },
  {
    etiqueta: "Quando a casa pede",
    icon: FileText,
    titulo: "O documento canônico sai pronto",
    antes: "Antes: montar ata e registro no improviso, com risco de erro.",
    solucao:
      "Os documentos da jornada vocacional e os registros são gerados a partir dos dados já lançados.",
    ganho: "Conformidade e memória institucional de verdade.",
  },
];

const GANHOS: { icon: LucideIcon; titulo: string; texto: string }[] = [
  { icon: Clock, titulo: "Tempo de volta", texto: "O que era digitação e relatório manual volta a ser tempo com as pessoas." },
  { icon: Compass, titulo: "Clareza diária", texto: "Você sempre sabe o próximo passo — de cada grupo e de cada formando." },
  { icon: Network, titulo: "Continuidade", texto: "A formação não reinicia a cada troca de equipe: o histórico permanece." },
  { icon: BookMarked, titulo: "Memória viva", texto: "A jornada de cada membro fica preservada e consultável, não espalhada." },
  { icon: Shield, titulo: "Conformidade", texto: "Registros e documentos prontos para prestar contas com segurança." },
  { icon: Heart, titulo: "Cuidado que não se perde", texto: "Ninguém some sem que alguém perceba e possa acolher a tempo." },
];

// ── Componente ────────────────────────────────────────────────────────────────

export function JornadaClient() {
  const reduce = useReducedMotion();

  // Barra de progresso de leitura (topo).
  const { scrollYProgress } = useScroll();

  // Linha da timeline que se "desenha" conforme a rolagem.
  const timelineRef = useRef<HTMLOListElement>(null);
  const { scrollYProgress: lineProgress } = useScroll({
    target: timelineRef,
    offset: ["start 0.4", "end 0.6"],
  });

  return (
    <>
      {/* Progresso de leitura */}
      <motion.div
        aria-hidden="true"
        className="fixed top-0 left-0 right-0 h-0.5 bg-primary origin-left z-[60]"
        style={{ scaleX: reduce ? 1 : scrollYProgress }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 pt-36 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[640px] h-[640px] bg-primary/15 rounded-full blur-[130px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6"
          >
            <Sparkles className="h-3.5 w-3.5" /> A jornada de quem conduz a formação
          </motion.div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
            className="text-3xl sm:text-5xl font-bold text-white leading-tight mb-6"
          >
            Do caderno espalhado à{" "}
            <span className="text-primary">memória viva</span> da comunidade
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
            className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto"
          >
            Acompanhe um dia de quem já usa a Formattio — e veja como cada dor do
            cotidiano da formação vira um ganho concreto.
          </motion.p>

          {!reduce && (
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="mt-14 inline-flex flex-col items-center text-slate-500"
            >
              <span className="text-xs uppercase tracking-widest mb-1">Role para começar</span>
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          )}
        </div>
      </section>

      {/* ── As dores (o "antes") ─────────────────────────────────────────── */}
      <section className="relative bg-slate-900 border-y border-white/5 py-24">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
              O peso do dia a dia sem a Formattio
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Você reconhece estas dores?
            </h2>
          </Reveal>

          <motion.div
            variants={reduce ? undefined : staggerParent}
            initial={reduce ? false : "hidden"}
            whileInView={reduce ? undefined : "show"}
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {DORES.map(({ icon: Icon, titulo, texto }) => (
              <motion.div
                key={titulo}
                variants={reduce ? undefined : staggerItem}
                className="rounded-2xl border border-white/10 bg-slate-800/40 p-6"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                  <Icon className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{titulo}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{texto}</p>
              </motion.div>
            ))}
          </motion.div>

          <Reveal delay={0.1} className="mt-14 flex flex-col items-center text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 mb-4">
              <ArrowDown className="h-5 w-5 text-primary" />
            </div>
            <p className="text-slate-300 text-lg max-w-md">
              Agora veja o <span className="text-primary font-semibold">mesmo dia</span>, com a
              Formattio do seu lado.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── Um dia com a Formattio (timeline) ────────────────────────────── */}
      <section className="relative bg-slate-950 py-24">
        <div className="max-w-3xl mx-auto px-4">
          <Reveal className="text-center mb-16">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
              Um dia com a Formattio
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Cada momento do dia, resolvido
            </h2>
          </Reveal>

          <ol ref={timelineRef} className="relative">
            {/* Trilho base + linha que se desenha */}
            <div className="absolute left-5 sm:left-6 top-2 bottom-2 w-px bg-white/10" aria-hidden="true" />
            <motion.div
              aria-hidden="true"
              className="absolute left-5 sm:left-6 top-2 bottom-2 w-px bg-primary origin-top"
              style={{ scaleY: reduce ? 1 : lineProgress }}
            />

            {MOMENTOS.map(({ etiqueta, icon: Icon, titulo, antes, solucao, ganho }, i) => (
              <li key={titulo} className="relative pl-14 sm:pl-16 pb-12 last:pb-0">
                <Reveal y={24} delay={0.04 * i}>
                  {/* Nó da timeline */}
                  <span className="absolute left-0 top-0 inline-flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-slate-900 border border-primary/40 text-primary shadow-lg shadow-primary/10">
                    <Icon className="h-5 w-5" />
                  </span>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                    <span className="inline-block text-xs font-medium text-primary uppercase tracking-wider mb-2">
                      {etiqueta}
                    </span>
                    <h3 className="text-lg font-semibold text-white mb-4">{titulo}</h3>

                    <p className="flex items-start gap-2 text-sm text-slate-500 mb-3">
                      <FileWarning className="h-4 w-4 shrink-0 mt-0.5 text-slate-600" />
                      <span>{antes}</span>
                    </p>
                    <p className="flex items-start gap-2 text-sm text-slate-200 leading-relaxed mb-4">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                      <span>{solucao}</span>
                    </p>

                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      {ganho}
                    </span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Os ganhos ────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-900 border-y border-white/5 py-24">
        <div className="max-w-5xl mx-auto px-4">
          <Reveal className="max-w-2xl mx-auto text-center mb-14">
            <p className="text-sm font-medium text-primary uppercase tracking-widest mb-3">
              O que você ganha
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Ganhos que aparecem já na primeira semana
            </h2>
          </Reveal>

          <motion.div
            variants={reduce ? undefined : staggerParent}
            initial={reduce ? false : "hidden"}
            whileInView={reduce ? undefined : "show"}
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {GANHOS.map(({ icon: Icon, titulo, texto }) => (
              <motion.div
                key={titulo}
                variants={reduce ? undefined : staggerItem}
                className="rounded-2xl border border-white/10 bg-slate-800/40 p-6"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{titulo}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{texto}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA final ────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 py-24 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <Reveal>
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/10 to-transparent p-10 sm:p-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Essa jornada começa com uma conversa
              </h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                No acesso antecipado, a equipe acompanha seus primeiros passos — e você
                vive esse dia a dia com a sua própria comunidade.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/acesso-antecipado"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
                >
                  Quero começar minha jornada
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/recursos"
                  className="inline-flex items-center gap-2 px-8 py-3.5 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
                >
                  Ver os recursos
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
