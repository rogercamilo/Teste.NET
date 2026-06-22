"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import type { PublicBranding } from "@/lib/public-branding";

const ERRO_MENSAGENS: Record<string, string> = {
  "link-invalido": "O link de acesso é inválido. Solicite um novo abaixo.",
  "link-expirado": "O link de acesso expirou. Solicite um novo abaixo.",
};

export default function PortalLanding({ branding }: { branding: PublicBranding }) {
  const searchParams = useSearchParams();
  const erro = searchParams.get("erro");
  const erroMensagem = erro ? (ERRO_MENSAGENS[erro] ?? null) : null;

  const communityName = branding.nomePlataforma ?? branding.nome;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/portal/solicitar-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setFormError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setFormError(data?.error ?? "Não foi possível enviar o link. Tente novamente.");
        return;
      }
      // Sucesso silencioso (a API não revela se o e-mail está cadastrado)
      setEnviado(true);
    } catch {
      setFormError("Falha de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center text-center mb-8">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={communityName}
              className="h-10 max-w-[160px] object-contain mb-4"
            />
          ) : (
            <img
              src="/brand/formatio-symbol.svg"
              alt="Formattio"
              width={48}
              height={48}
              className="mb-4"
            />
          )}
          <h1 className="text-xl font-bold text-foreground">{communityName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Portal do Formando</p>
        </div>

        {enviado ? (
          <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Verifique seu e-mail</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Se <span className="font-medium text-foreground">{email}</span> estiver
              cadastrado, você receberá um link de acesso em instantes. O link é válido
              por 15 minutos.
            </p>
            <button
              type="button"
              onClick={() => {
                setEnviado(false);
                setEmail("");
              }}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Informe seu e-mail para receber um link de acesso seguro. Não é
                necessária senha.
              </p>
            </div>

            {erroMensagem && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-amber-100 border border-amber-200 text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {erroMensagem}
              </div>
            )}

            {formError && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  E-mail
                </Label>
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
                    Receber link de acesso
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Problemas para acessar? Fale com o seu formador.
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
