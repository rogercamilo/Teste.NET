"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertCircle, Mail, UserCheck } from "lucide-react";
import { validatePassword } from "@/lib/password-validation";
import Link from "next/link";

interface ConviteInfo {
  email: string;
  nome: string;
  perfil: string;
  orgNome: string;
}

export default function ConviteForm({ token }: { token: string }) {
  const router = useRouter();
  const [convite, setConvite] = useState<ConviteInfo | null>(null);
  const [loadingConvite, setLoadingConvite] = useState(true);
  const [conviteError, setConviteError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const pwErrors = validatePassword(senha).errors;
  const senhasIguais = senha === confirmarSenha;

  useEffect(() => {
    fetch(`/api/convites/${token}`)
      .then(async (res) => {
        const data = await res.json() as ConviteInfo & { error?: string };
        if (!res.ok) { setConviteError(data.error ?? "Convite inválido"); return; }
        setConvite(data);
        setNome(data.nome);
      })
      .catch(() => setConviteError("Falha ao carregar convite"))
      .finally(() => setLoadingConvite(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!senhasIguais) { setFormError("As senhas não coincidem"); return; }
    if (pwErrors.length > 0) { setFormError(pwErrors.join("; ")); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/convites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha, nome }),
      });
      const data = await res.json() as { error?: string; email?: string };
      if (!res.ok) { setFormError(data.error ?? "Erro ao ativar conta"); setLoading(false); return; }

      const result = await signIn("credentials", { email: data.email!, password: senha, redirect: false });
      if (result?.error) { router.push("/login"); }
      else { router.push("/dashboard"); router.refresh(); }
    } catch {
      setFormError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  if (loadingConvite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (conviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Convite inválido</h2>
          <p className="text-sm text-muted-foreground mb-6">{conviteError}</p>
          <Link href="/login">
            <Button variant="outline">Ir para o login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Ativar conta</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Você foi convidado(a) para a organização{" "}
            <span className="font-medium text-foreground">{convite?.orgNome}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-muted/50 border border-border text-sm">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">Conta para: <span className="font-medium text-foreground">{convite?.email}</span></span>
        </div>

        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="senha">Criar senha</Label>
            <div className="relative">
              <Input
                id="senha"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="pr-9 h-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {senha && pwErrors.length > 0 && (
              <ul className="text-xs text-destructive space-y-0.5">
                {pwErrors.map((e) => <li key={e}>• {e}</li>)}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmar">Confirmar senha</Label>
            <Input
              id="confirmar"
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              className="h-10"
            />
            {confirmarSenha && !senhasIguais && (
              <p className="text-xs text-destructive">As senhas não coincidem</p>
            )}
          </div>

          <Button type="submit" className="w-full h-10 mt-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Ativando conta...
              </span>
            ) : "Ativar conta e entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
