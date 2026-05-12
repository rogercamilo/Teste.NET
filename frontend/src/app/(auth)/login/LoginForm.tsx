"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const error = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [logo, setLogo] = useState<string | null>(null);
  const [communityName, setCommunityName] = useState("Comunidade Missionária Dom Bosco");
  const [communityDesc, setCommunityDesc] = useState(
    "Plataforma pedagógica para gestão e acompanhamento da jornada formativa comunitária."
  );

  useEffect(() => {
    setLogo(localStorage.getItem("appForm:logo"));
    try {
      const raw = localStorage.getItem("appForm:comunidade");
      if (raw) {
        const cfg = JSON.parse(raw) as { nome?: string; descricao?: string; missao?: string };
        if (cfg.nome) setCommunityName(cfg.nome);
        if (cfg.missao || cfg.descricao)
          setCommunityDesc(cfg.missao ?? cfg.descricao ?? communityDesc);
      }
    } catch {}
  }, []);

  const errorMessages: Record<string, string> = {
    CredentialsSignin: "E-mail ou senha inválidos.",
    OAuthAccountNotLinked: "Este e-mail já está cadastrado com outro método.",
    Default: "Erro ao autenticar. Tente novamente.",
  };

  const displayError = error ? (errorMessages[error] ?? errorMessages.Default) : formError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setFormError(errorMessages.CredentialsSignin);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  }

  async function handleGoogleSignIn() {
    setLoadingGoogle(true);
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80 opacity-90" />
        <div className="relative z-10 flex flex-col items-center text-center text-primary-foreground max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            {logo ? (
              <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden p-1.5 mx-auto">
                <img src={logo} alt="Logo" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold">AFC</span>
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-3">
            Aplicativo para<br />Formação Comunitária
          </h1>
          <p className="text-base text-white/90 font-medium mb-4">{communityName}</p>
          <p className="text-sm text-white/60 leading-relaxed">{communityDesc}</p>
        </div>

        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            {logo ? (
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mr-2.5 overflow-hidden p-1">
                <img src={logo} alt="Logo" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center mr-2.5">
                <span className="text-xs font-bold text-primary-foreground">AFC</span>
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground text-sm leading-tight">Formação Comunitária</p>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{communityName}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo(a)</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Entre com sua conta para acessar a plataforma
            </p>
          </div>

          {displayError && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {displayError}
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
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <a href="/recuperar-senha" className="text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-9 pr-9 h-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-10" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Entrando...
                </span>
              ) : "Entrar"}
            </Button>
          </form>

          <div className="relative my-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
              ou continue com
            </span>
          </div>

          <Button
            variant="outline"
            className="w-full h-10 gap-2.5"
            onClick={handleGoogleSignIn}
            disabled={loadingGoogle}
          >
            {loadingGoogle ? (
              <span className="h-4 w-4 rounded-full border-2 border-border border-t-foreground animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Entrar com Google
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Problemas para acessar?{" "}
            <a href="mailto:admin@dombosco.org" className="text-primary hover:underline">
              Fale com o administrador
            </a>
          </p>
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center">
          © {new Date().getFullYear()} {communityName}
        </p>
      </div>
    </div>
  );
}
