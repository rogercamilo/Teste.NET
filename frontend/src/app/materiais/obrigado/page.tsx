import Link from "next/link";
import type { Metadata } from "next";
import { Download, MessageCircle, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { EBOOK_URL, EBOOK_TITULO, WHATSAPP_CHANNEL_URL } from "@/lib/leads-config";

// CSP nonce + strict-dynamic quebram páginas estáticas; força render dinâmico.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Seu material está pronto — Formattio",
  description: "Baixe o eBook e conheça a Formattio.",
  robots: { index: false, follow: false },
};

export default async function ObrigadoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const tokenInvalido = status === "invalido" || status === "erro";

  return (
    <div className="font-sans antialiased bg-slate-950 min-h-screen">
      <MarketingNav />

      <section className="relative bg-slate-950 pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>

          {tokenInvalido ? (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Seu material está aqui
              </h1>
              <p className="text-slate-400 leading-relaxed mb-8">
                Não conseguimos validar o link de confirmação — mas você já pode baixar o
                eBook abaixo. Se você acabou de se cadastrar, confirme pelo e-mail que enviamos
                para receber as próximas novidades.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Tudo certo! Seu material está pronto
              </h1>
              <p className="text-slate-400 leading-relaxed mb-8">
                Obrigado por confirmar. Baixe agora o eBook{" "}
                <strong className="text-slate-200">“{EBOOK_TITULO}”</strong> e comece a
                organizar a jornada formativa da sua comunidade.
              </p>
            </>
          )}

          <a
            href={EBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Download className="h-5 w-5" />
            Baixar o eBook
          </a>
        </div>
      </section>

      {/* Bônus: Canal do WhatsApp (só se configurado) */}
      {WHATSAPP_CHANNEL_URL && (
        <section className="bg-slate-900 border-t border-white/5 py-16">
          <div className="max-w-2xl mx-auto px-4">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <MessageCircle className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Bônus: entre no nosso canal</h2>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed max-w-md mx-auto">
                Receba dicas de formação, governança de dados e comunitária, e avisos de
                eventos direto no WhatsApp — conteúdo de valor, sem spam. É só um canal de
                avisos: seu número fica privado.
              </p>
              <a
                href={WHATSAPP_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Entrar no Canal do WhatsApp
              </a>
            </div>
          </div>
        </section>
      )}

      {/* CTA período de experiência */}
      <section className="bg-slate-950 py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Sem cartão de crédito
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Do papel à prática: veja a plataforma por dentro
          </h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm leading-relaxed">
            O eBook mostra o caminho; o Formattio faz acontecer. Experimente por 30 dias,
            com acesso completo — grupos, jornada, documentos e governança em um só lugar.
          </p>
          <Link
            href="/registro"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            Começar meu período de experiência
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
