"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import type { PublicBranding } from "@/lib/public-branding";

interface Props {
  token: string;
  nome: string;
  email: string;
  grupoNome: string | null;
  branding: PublicBranding;
}

const REGRAS: { label: string; test: (s: string) => boolean }[] = [
  { label: "Mínimo de 8 caracteres", test: (s) => s.length >= 8 },
  { label: "Uma letra maiúscula", test: (s) => /[A-Z]/.test(s) },
  { label: "Uma letra minúscula", test: (s) => /[a-z]/.test(s) },
  { label: "Um número", test: (s) => /[0-9]/.test(s) },
  { label: "Um caractere especial", test: (s) => /[^A-Za-z0-9]/.test(s) },
];

export default function AtivarClient({ token, nome, email, grupoNome, branding }: Props) {
  const router = useRouter();
  const communityName = branding.nomePlataforma ?? branding.nome;
  const primeiroNome = nome.split(" ")[0];

  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const regrasOk = REGRAS.every((r) => r.test(senha));
  const confere = senha.length > 0 && senha === confirmar;
  const podeEnviar = regrasOk && confere && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(`/api/portal/ativar/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      if (res.ok) {
        router.push("/portal/dashboard");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      setErro(data?.error ?? "Não foi possível definir a senha. Tente novamente.");
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
          <h1 className="text-xl font-bold text-foreground">Olá, {primeiroNome}!</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma senha para acessar o {communityName}.
          </p>
          {grupoNome && (
            <p className="text-xs text-muted-foreground mt-1">Grupo: {grupoNome}</p>
          )}
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email-ro" className="text-sm font-medium">E-mail</Label>
            <Input id="email-ro" type="email" value={email} readOnly disabled className="h-10 bg-muted/40" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="senha" className="text-sm font-medium">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="senha"
                type="password"
                className="pl-9 h-10"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar" className="text-sm font-medium">Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmar"
                type="password"
                className="pl-9 h-10"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {confirmar.length > 0 && !confere && (
              <p className="text-xs text-destructive">As senhas não coincidem.</p>
            )}
          </div>

          <ul className="space-y-1">
            {REGRAS.map((r) => {
              const ok = r.test(senha);
              return (
                <li key={r.label} className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className={ok ? "h-3.5 w-3.5 text-emerald-600" : "h-3.5 w-3.5 text-muted-foreground/40"} />
                  <span className={ok ? "text-muted-foreground" : "text-muted-foreground/60"}>{r.label}</span>
                </li>
              );
            })}
          </ul>

          <Button type="submit" className="w-full h-10 gap-2" disabled={!podeEnviar}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Salvando...
              </span>
            ) : (
              <>
                Criar senha e entrar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          © {new Date().getFullYear()} {communityName}
        </p>
      </div>
    </div>
  );
}
