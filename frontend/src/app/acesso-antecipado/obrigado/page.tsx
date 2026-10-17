import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckCircle2,
  Calendar,
  MessageCircle,
  ArrowRight,
  Compass,
  Clock,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { SCHEDULING_URL, CONTATO_WHATSAPP_URL } from "@/lib/leads-config";

export const metadata: Metadata = {
  title: "Pedido recebido — Formattio",
  description: "Recebemos seu pedido de acesso antecipado. A equipe entra em contato em breve.",
  robots: { index: false, follow: false },
};

const COPY: Record<string, { titulo: string; texto: string }> = {
  demonstracao: {
    titulo: "Vamos agendar sua demonstração",
    texto:
      "Recebemos seu pedido. Em breve a equipe entra em contato para marcar uma demonstração no melhor horário para você.",
  },
  acesso_antecipado: {
    titulo: "Seu acesso antecipado está a caminho",
    texto:
      "Recebemos seu pedido. A equipe vai acompanhar a configuração inicial e os seus primeiros passos na plataforma.",
  },
  duvida: {
    titulo: "Recebemos sua mensagem",
    texto:
      "Obrigado por escrever. A equipe vai responder a sua dúvida pelo contato que você informou.",
  },
  default: {
    titulo: "Tudo certo! Recebemos seu pedido",
    texto:
      "Obrigado pelo interesse na Formattio. A equipe entra em contato em breve para acompanhar os seus primeiros passos.",
  },
};

export default async function AcessoAntecipadoObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ intencao?: string }>;
}) {
  const { intencao } = await searchParams;
  const copy = COPY[intencao ?? "default"] ?? COPY.default;
  const temProximoPasso = Boolean(SCHEDULING_URL || CONTATO_WHATSAPP_URL);

  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <MarketingNav />

      <section className="relative bg-slate-950 pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-primary/15 rounded-full blur-[110px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6 animate-in fade-in-0 zoom-in-50 duration-700">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:80ms]">
            {copy.titulo}
          </h1>
          <p className="text-slate-400 leading-relaxed max-w-xl mx-auto animate-in fade-in-0 slide-in-from-bottom-3 duration-700 [animation-delay:160ms]">
            {copy.texto}
          </p>
        </div>
      </section>

      {/* Próximos passos imediatos (agendar / WhatsApp) — quando configurados */}
      {temProximoPasso && (
        <section className="bg-slate-900 border-y border-white/5 py-16">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="text-center text-sm font-medium text-primary uppercase tracking-widest mb-8">
              Quer adiantar? Dê o próximo passo agora
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch justify-center gap-4">
              {SCHEDULING_URL && (
                <a
                  href={SCHEDULING_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center text-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-7 hover:border-primary/60 transition-colors"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 border border-primary/30">
                    <Calendar className="h-6 w-6 text-primary" />
                  </span>
                  <span className="text-base font-semibold text-white">Agendar uma conversa</span>
                  <span className="text-sm text-slate-400">
                    Escolha o melhor horário para falar com a equipe.
                  </span>
                </a>
              )}
              {CONTATO_WHATSAPP_URL && (
                <a
                  href={CONTATO_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex flex-col items-center text-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-7 hover:border-emerald-500/60 transition-colors"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <MessageCircle className="h-6 w-6 text-emerald-400" />
                  </span>
                  <span className="text-base font-semibold text-white">Falar no WhatsApp</span>
                  <span className="text-sm text-slate-400">
                    Converse agora mesmo, de forma rápida e direta.
                  </span>
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Reassurance quando ainda não há canais externos configurados */}
      {!temProximoPasso && (
        <section className="bg-slate-900 border-y border-white/5 py-14">
          <div className="max-w-xl mx-auto px-4">
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-800/40 p-6">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-relaxed">
                A equipe entra em contato em breve pelo WhatsApp e pelo e-mail que você informou.
                Fique de olho nas suas mensagens.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Enquanto isso — explorar conteúdo */}
      <section className="bg-slate-950 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Enquanto a equipe prepara seu contato</h2>
          <p className="text-slate-400 mb-7 text-sm leading-relaxed max-w-md mx-auto">
            Conheça como a Formattio organiza a jornada formativa — método, memória e governança da
            formação comunitária.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/recursos"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm w-full sm:w-auto justify-center"
            >
              <Compass className="h-4 w-4" />
              Ver os recursos
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white font-medium rounded-xl transition-colors text-sm w-full sm:w-auto justify-center"
            >
              Ler o blog
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
