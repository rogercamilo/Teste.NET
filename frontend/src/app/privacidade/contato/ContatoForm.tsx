"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Mail, Send } from "lucide-react";

// Tipos de solicitação espelham os direitos do titular (art. 18 LGPD) descritos
// na seção 14 da Política. A submissão compõe um e-mail estruturado para o Canal
// de Privacidade — não armazenamos a solicitação em base própria (o fluxo fica no
// e-mail já declarado como canal oficial), evitando novo ponto de coleta de PII.
const TIPOS = [
  "Confirmação de tratamento e acesso aos dados",
  "Retificação de dados",
  "Anonimização, bloqueio ou eliminação",
  "Portabilidade dos dados",
  "Eliminação de dados tratados por consentimento",
  "Revogação de consentimento / descadastramento",
  "Informação sobre compartilhamento",
  "Oposição ao tratamento",
  "Revisão de decisão automatizada",
  "Outra solicitação de privacidade",
] as const;

const PRIVACY_EMAIL = "privacidade@formattio.com.br";

export function ContatoForm() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tipo, setTipo] = useState<string>(TIPOS[0]);
  const [mensagem, setMensagem] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `[Privacidade] ${tipo}`;
    const body = [
      `Tipo de solicitação: ${tipo}`,
      `Nome: ${nome}`,
      `E-mail de contato: ${email}`,
      "",
      "Detalhes da solicitação:",
      mensagem || "(sem detalhes adicionais)",
      "",
      "—",
      "Enviado pelo formulário de privacidade da Formattio.",
    ].join("\n");
    window.location.href = `mailto:${PRIVACY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const inputCls =
    "w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground font-semibold hover:opacity-80 transition-opacity"
          >
            <Shield className="h-5 w-5 text-primary" />
            Formattio
          </Link>
          <Link
            href="/privacidade"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à Política
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Canal de Privacidade — Solicitações do Titular
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Use este formulário para exercer seus direitos previstos na{" "}
            <strong className="text-foreground">LGPD (art. 18)</strong>. Ao enviar, seu aplicativo de
            e-mail abrirá uma mensagem já estruturada para o nosso Canal de Privacidade
            (<span className="text-foreground">{PRIVACY_EMAIL}</span>). Responderemos em até{" "}
            <strong className="text-foreground">15 dias corridos</strong>.
          </p>
          <div className="mt-4 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 text-xs text-blue-800 dark:text-blue-300">
            Para sua segurança, poderemos solicitar informações adicionais para confirmar sua
            identidade antes de atender à solicitação, prevenindo fraudes e acessos não autorizados.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <label htmlFor="nome" className="text-sm font-medium text-foreground">Nome completo</label>
            <input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail de contato</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="tipo" className="text-sm font-medium text-foreground">Tipo de solicitação</label>
            <select id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="mensagem" className="text-sm font-medium text-foreground">
              Detalhes <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              id="mensagem" rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)}
              placeholder="Descreva sua solicitação com o máximo de detalhes possível."
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <Send className="h-4 w-4" />
              Enviar solicitação
            </button>
            <a
              href={`mailto:${PRIVACY_EMAIL}`}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border/60 bg-background px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Mail className="h-4 w-4" />
              Ou escreva direto: {PRIVACY_EMAIL}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
