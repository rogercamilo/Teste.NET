"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { validatePassword } from "@/lib/password-validation";
import Link from "next/link";

export default function RegistroForm() {
  const router = useRouter();

  const [orgNome, setOrgNome] = useState("");
  const [adminNome, setAdminNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwErrors = validatePassword(senha).errors;
  const senhasIguais = senha === confirmarSenha;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!senhasIguais) { setError("As senhas não coincidem"); return; }
    if (pwErrors.length > 0) { setError(pwErrors.join("; ")); return; }
    if (!aceitouPrivacidade) { setError("Aceite a Política de Privacidade para continuar"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgNome, adminNome, adminEmail, senha, aceitouPrivacidade }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Erro ao criar conta"); setLoading(false); return; }

      // Auto-login
      const result = await signIn("credentials", { email: adminEmail, password: senha, redirect: false });
      if (result?.error) {
        router.push("/login");
      } else {
        router.push("/onboarding");
      }
    } catch {
      setError("Falha de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
  <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — identidade Formattio fixa; quem registra ainda não é cliente da plataforma */}
      <div
        className="hidden lg:flex lg:w-5/12 flex-col justify-between p-10"
        style={{ backgroundColor: "#B25433" }}
      >
        {/* Logo — topo esquerdo */}
        <img
          src="/brand/formatio-symbol-mono-white.svg"
          alt="Formattio"
          width={144}
          height={144}
        />

        {/* Headline, descrição e URL — agrupados no rodapé */}
        <div>
          <h1
            className="text-4xl font-bold leading-tight mb-5"
            style={{ color: "#FFFFFF" }}
          >
            Comece a jornada formativa da sua comunidade.
          </h1>
          <p
            className="text-base leading-relaxed mb-8"
            style={{ color: "rgba(255,255,255,0.68)" }}
          >
            Cadastre membros, organize grupos e estruture planos formativos por nível.
          </p>
          <p
            className="text-xs font-medium tracking-widest uppercase"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            www.formattio.com.br
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 bg-background overflow-hidden">
        {/* Mobile logo */}
        <div className="flex items-center justify-center mb-6 lg:hidden">
          <img
            src="/brand/formatio-symbol.svg"
            alt="Formattio"
            width={40}
            height={40}
            className="mr-2.5 shrink-0"
          />
          <p className="font-semibold text-foreground text-sm leading-tight">Formattio</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-3">
            <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Registre sua organização — é grátis por 14 dias.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="orgNome">Nome da organização</Label>
              <Input
                id="orgNome"
                placeholder="Ex: Instituto de Formação Comunitária"
                value={orgNome}
                onChange={(e) => setOrgNome(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="adminNome">Seu nome</Label>
              <Input
                id="adminNome"
                placeholder="Nome completo"
                value={adminNome}
                onChange={(e) => setAdminNome(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="adminEmail">E-mail</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="seu@email.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className="pr-9 h-9"
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
                <ul className="text-xs text-destructive space-y-0.5 mt-1">
                  {pwErrors.map((e) => <li key={e}>• {e}</li>)}
                </ul>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmarSenha">Confirmar senha</Label>
              <Input
                id="confirmarSenha"
                type="password"
                placeholder="Repita a senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                className="h-9"
              />
              {confirmarSenha && !senhasIguais && (
                <p className="text-xs text-destructive">As senhas não coincidem</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                id="privacidade"
                type="checkbox"
                checked={aceitouPrivacidade}
                onChange={(e) => setAceitouPrivacidade(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer"
              />
              <label htmlFor="privacidade" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Li e concordo com a{" "}
                <a href="/privacidade" target="_blank" className="text-primary hover:underline">
                  Política de Privacidade
                </a>{" "}
                e os{" "}
                <a href="/termos" target="_blank" className="text-primary hover:underline">
                  Termos de Uso
                </a>
                .
              </label>
            </div>

            <Button type="submit" className="w-full h-9 mt-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Criando conta...
                </span>
              ) : "Criar conta gratuitamente"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-3">
            Já tem conta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
