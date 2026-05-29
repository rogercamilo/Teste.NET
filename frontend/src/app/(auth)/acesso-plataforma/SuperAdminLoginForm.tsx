"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Mail, AlertCircle, ShieldAlert, ShieldCheck } from "lucide-react";

export default function SuperAdminLoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    const result = await signIn("credentials", {
      email,
      password,
      loginSource: "super_admin",
      ...(mfaRequired ? { totp: totpCode } : {}),
      redirect: false,
    });

    setLoading(false);

    if (result?.error === "MFARequired") {
      setMfaRequired(true);
      setFormError(null);
    } else if (result?.error) {
      setFormError(
        mfaRequired
          ? "Código inválido. Verifique o aplicativo autenticador."
          : "Credenciais inválidas ou acesso não autorizado."
      );
    } else {
      router.push("/super-admin/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            {mfaRequired
              ? <ShieldCheck className="h-7 w-7 text-red-400" />
              : <ShieldAlert className="h-7 w-7 text-red-400" />
            }
          </div>
          <img
            src="/brand/formatio-symbol-mono-white.svg"
            alt="Formatio"
            width={32}
            height={32}
            className="mb-3 opacity-40"
          />
          <h1 className="text-lg font-bold text-slate-100">
            {mfaRequired ? "Verificação em dois fatores" : "Acesso Restrito"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 tracking-wide uppercase">
            Plataforma Formatio · Administração
          </p>
        </div>

        {formError && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-950/50 border border-red-800/50 text-red-300 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {formError}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!mfaRequired ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-300">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@formatio.app"
                      className="pl-9 h-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-red-500/30 focus-visible:border-red-500/50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-9 pr-9 h-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-red-500/30 focus-visible:border-red-500/50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">
                  Digite o código de 6 dígitos do seu aplicativo autenticador.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="totp" className="text-sm font-medium text-slate-300">
                    Código do autenticador
                  </Label>
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    className="h-10 text-center text-xl tracking-widest font-mono bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-600 focus-visible:ring-red-500/30 focus-visible:border-red-500/50"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { setMfaRequired(false); setTotpCode(""); setFormError(null); }}
                  className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
                >
                  Voltar ao login
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 bg-red-800 hover:bg-red-700 text-white border-0 mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-red-300/30 border-t-red-300 animate-spin" />
                  {mfaRequired ? "Verificando..." : "Autenticando..."}
                </span>
              ) : mfaRequired ? "Verificar" : "Acessar"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          © {new Date().getFullYear()} Formatio · Acesso monitorado
        </p>
      </div>
    </div>
  );
}
