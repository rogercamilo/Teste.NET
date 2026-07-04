"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import type { PublicBranding } from "@/lib/public-branding";
import { portalHomeFor } from "@/lib/portal-routes";

export default function RecuperarClient({ branding }: { branding: PublicBranding }) {
  const communityName = branding.nomePlataforma ?? branding.nome;
  // Porta de origem propagada por ?p= — mantém o usuário no seu próprio portal.
  const isVocacional = useSearchParams().get("p") === "vocacional";
  const portalHome = portalHomeFor(isVocacional ? "vocacional" : "formando");
  const portalNome = isVocacional ? "Portal do Vocacionado" : "Portal do Formando";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/portal/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setErro("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        return;
      }
      // Sucesso silencioso (não revela se o e-mail existe).
      setEnviado(true);
    } catch {
      setErro("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={communityName} className="h-10 max-w-[160px] object-contain mb-4" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/formatio-symbol.svg" alt="Formattio" width={48} height={48} className="mb-4" />
          )}
          <h1 className="text-xl font-bold text-foreground">Recuperar senha</h1>
          <p className="text-sm text-muted-foreground mt-1">{portalNome}</p>
        </div>

        {enviado ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Verifique seu e-mail</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Se <span className="font-medium text-foreground">{email}</span> tiver uma conta,
              você receberá um link para redefinir a senha. O link é válido por 1 hora.
            </p>
            <Link href={portalHome} className="mt-4 inline-block text-xs text-primary hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-muted-foreground leading-relaxed">
              Informe seu e-mail e enviaremos um link para você criar uma nova senha.
            </p>

            {erro && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erro}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-9 h-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <>
                    Enviar link
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              <Link href={portalHome} className="text-primary hover:underline">Voltar ao login</Link>
            </p>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-8 text-center">
          © {new Date().getFullYear()} {communityName}
        </p>
      </div>
    </div>
  );
}
