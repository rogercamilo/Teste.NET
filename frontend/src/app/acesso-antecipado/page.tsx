import type { Metadata } from "next";
import { Sparkles, HeartHandshake, ShieldCheck, Compass } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { INTENCAO_OPCOES } from "@/lib/acesso-antecipado-opcoes";
import { AcessoAntecipadoForm } from "./AcessoAntecipadoForm";

export const metadata: Metadata = {
  title: "Acesso antecipado — Formattio",
  description:
    "Peça acesso antecipado à Formattio. Nossa equipe acompanha os primeiros passos: configuração inicial e uma experiência prática com a plataforma de jornada formativa.",
  alternates: { canonical: "/acesso-antecipado" },
  openGraph: {
    title: "Acesso antecipado — Formattio",
    description:
      "Comece sua jornada com a Formattio acompanhado pela nossa equipe. Sem cartão de crédito.",
    url: "/acesso-antecipado",
  },
};

const ETAPAS = [
  {
    icon: HeartHandshake,
    title: "Conversa inicial",
    desc: "A equipe entende a realidade da sua comunidade e apresenta as condições do acesso antecipado.",
  },
  {
    icon: Compass,
    title: "Configuração orientada",
    desc: "Ajudamos a dar o primeiro passo: um grupo, um encontro ou uma etapa — sem reorganizar tudo de uma vez.",
  },
  {
    icon: Sparkles,
    title: "Experiência prática",
    desc: "Você vê a plataforma funcionando com a sua formação, com acompanhamento de perto.",
  },
];

export default async function AcessoAntecipadoPage({
  searchParams,
}: {
  searchParams: Promise<{ intencao?: string; plano?: string }>;
}) {
  const sp = await searchParams;
  const intencaoInicial =
    INTENCAO_OPCOES.find((o) => o.value === sp.intencao)?.value ?? "";
  const planoInteresse = sp.plano?.trim().slice(0, 60) || "";

  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <MarketingNav />

      {/* Hero */}
      <section className="relative bg-slate-950 pt-32 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-700">
            <Sparkles className="h-3.5 w-3.5" /> Acesso antecipado acompanhado
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-5 leading-tight animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:80ms]">
            Comece sua jornada com a Formattio
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:160ms]">
            Você não recebe só uma conta para explorar sozinho. Nossa equipe
            acompanha os primeiros passos, ajuda na configuração inicial e orienta
            uma experiência prática com a plataforma. Conte um pouco sobre a sua
            comunidade — respondemos rápido.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-slate-400 animate-in fade-in-0 duration-700 [animation-delay:240ms]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Sem cartão de crédito
            </span>
            <span className="text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <HeartHandshake className="h-3.5 w-3.5 text-primary" /> Acompanhamento da equipe
            </span>
            <span className="text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-sky-400" /> Comece por um passo simples
            </span>
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section className="relative bg-slate-950 pb-20">
        <div className="relative max-w-2xl mx-auto px-4">
          <AcessoAntecipadoForm
            intencaoInicial={intencaoInicial}
            planoInteresse={planoInteresse}
          />
        </div>
      </section>

      {/* O que acontece depois */}
      <section className="bg-slate-900 border-y border-white/5 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-center text-sm font-medium text-primary uppercase tracking-widest mb-8">
            O que acontece depois
          </h2>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {ETAPAS.map(({ icon: Icon, title, desc }, i) => (
              <li
                key={title}
                className="rounded-2xl border border-white/10 bg-slate-800/40 p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-semibold">
                    {i + 1}
                  </span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
