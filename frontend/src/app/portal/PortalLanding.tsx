"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, AlertCircle, ArrowRight } from "lucide-react";
import type { PublicBranding } from "@/lib/public-branding";
import type { PortalAudiencia } from "@/lib/portal-routes";

const ERRO_MENSAGENS: Record<string, string> = {
  "link-invalido": "O link de acesso é inválido. Faça login abaixo.",
  "link-expirado": "Sua sessão expirou. Entre novamente.",
  "sessao-expirada": "Sua sessão expirou. Entre novamente.",
};

export default function PortalLanding({
  branding,
  portalNome = "Portal do Formando",
  portalKey = "formando",
}: {
  branding: PublicBranding;
  portalNome?: string;
  portalKey?: PortalAudiencia;
}) {
  // Propaga a porta de origem para o fluxo de recuperação, para que o "voltar
  // ao login" retorne à porta certa.
  const recuperarHref =
    portalKey === "vocacional" ? "/portal/recuperar?p=vocacional" : "/portal/recuperar";
  const router = useRouter();
  const searchParams = useSearchParams();
  const erro = searchParams.get("erro");
  const erroMensagem = erro ? (ERRO_MENSAGENS[erro] ?? null) : null;

  const communityName = branding.nomePlataforma ?? branding.nome;

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (res.ok) {
        router.push("/portal/dashboard");
        router.refresh();
        return;
      }
      if (res.status === 429) {
        setFormError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
        return;
      }
      const data = await res.json().catch(() => null);
      setFormError(data?.error ?? "E-mail ou senha inválidos.");
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt={communityName} className="h-10 max-w-[160px] object-contain mb-4" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/formatio-symbol.svg" alt="Formattio" width={48} height={48} className="mb-4" />
          )}
          <h1 className="text-xl font-bold text-foreground">{communityName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{portalNome}</p>
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

          <div className="space-y-1.5">
            <Label htmlFor="senha" className="text-sm font-medium">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="senha"
                type="password"
                placeholder="Sua senha"
                className="pl-9 h-10"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-10 gap-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Entrando...
              </span>
            ) : (
              <>
                Entrar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-sm mt-4">
          <Link href={recuperarHref} className="text-primary hover:underline">Esqueci minha senha</Link>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Primeiro acesso? Use o link enviado no seu e-mail de boas-vindas para criar sua senha.
        </p>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Problemas para acessar? Fale com o seu formador.
        </p>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          © {new Date().getFullYear()} {communityName}
        </p>
      </div>
    </div>
  );
}
