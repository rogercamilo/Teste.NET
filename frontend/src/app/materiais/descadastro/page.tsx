import Link from "next/link";
import type { Metadata } from "next";
import { MailX, ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

// CSP nonce + strict-dynamic quebram páginas estáticas; força render dinâmico.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inscrição cancelada — Formattio",
  description: "Você cancelou a inscrição na nossa lista.",
  robots: { index: false, follow: false },
};

export default function DescadastroPage() {
  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen flex flex-col">
      <MarketingNav />

      <section className="relative flex-1 bg-slate-950 pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative max-w-lg mx-auto px-4 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 border border-white/10 mb-6">
            <MailX className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Inscrição cancelada</h1>
          <p className="text-slate-400 leading-relaxed mb-8">
            Pronto — você não receberá mais nossos e-mails de novidades. Sentiremos sua
            falta! Se mudou de ideia, é só se inscrever novamente pela página inicial.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-slate-300 hover:border-white/40 hover:text-white rounded-xl transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
