"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Send } from "lucide-react";

/**
 * Opt-in de newsletter no blog. Reusa o pipeline público de leads
 * (`/api/leads/subscribe`) — double opt-in, honeypot, rate-limit e
 * consentimento LGPD. `origem` diferencia a captura do blog na base de leads.
 */
export function BlogNewsletter({ origem = "blog" }: { origem?: string }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ nome, email, consent: true, origem, website }),
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
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      {done ? (
        <div className="flex items-start gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Falta só confirmar!</h2>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">
              Enviamos um e-mail para <strong className="text-slate-200">{email}</strong>. Abra a
              mensagem e clique em <strong className="text-slate-200">confirmar</strong> para
              receber as novidades. Não esqueça de olhar o spam.
            </p>
          </div>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-white">
            Receba a governança formativa no seu e-mail
          </h2>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
            Artigos práticos sobre método, memória e conformidade na formação de comunidades e
            institutos. Sem spam — só conteúdo útil, quando publicamos.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            {/* Honeypot — invisível para humanos */}
            <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
              <label htmlFor={`nl-website-${origem}`}>Não preencha este campo</label>
              <input
                id={`nl-website-${origem}`}
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                aria-label="Seu nome"
                placeholder="Seu nome"
                className="w-full sm:w-1/3 rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Seu e-mail"
                placeholder="voce@comunidade.org"
                className="w-full flex-1 rounded-lg border border-white/10 bg-slate-900/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-medium px-5 py-2.5 hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm whitespace-nowrap"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Inscrever
              </button>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                required
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-slate-900 accent-primary"
              />
              <span>
                Autorizo o contato por e-mail e concordo com a{" "}
                <Link href="/privacidade" className="text-primary hover:underline" target="_blank">
                  Política de Privacidade
                </Link>
                . Cancele quando quiser, em 1 clique.
              </span>
            </label>

            {erro && <p className="text-xs text-red-400">{erro}</p>}
          </form>
        </>
      )}
    </aside>
  );
}
