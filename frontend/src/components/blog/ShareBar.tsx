"use client";

import { useState } from "react";
import { Check, Link2, MessageCircle } from "lucide-react";

// Barra de compartilhamento do artigo. WhatsApp é o canal de indicação central
// do go-to-market da Formattio; "copiar link" cobre os demais. Client component
// (usa clipboard/estado) — hidrata com o nonce da CSP normalmente.

export function ShareBar({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  // Enfatiza o ATO de compartilhar o artigo (indicação pessoal), não um link
  // cru do site — reduz a objeção de "mais um comercial da plataforma".
  const shareText = `Li este artigo e quis compartilhar com você:\n\n${title}\n${url}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível — silencioso */
    }
  }

  const cls =
    "inline-flex items-center gap-2 rounded-lg border border-white/15 text-slate-300 text-sm font-medium px-4 py-2 hover:bg-white/5 hover:text-white transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs uppercase tracking-widest text-slate-500">Compartilhar</span>
      <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cls}>
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
      <button type="button" onClick={copy} className={cls}>
        {copied ? (
          <>
            <Check className="h-4 w-4 text-primary" /> Copiado!
          </>
        ) : (
          <>
            <Link2 className="h-4 w-4" /> Copiar link
          </>
        )}
      </button>
    </div>
  );
}
