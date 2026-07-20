"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { passwordErrorMessage } from "@/lib/password-validation";

/**
 * Aba "Minha Conta" do cockpit — o super_admin é o operador da plataforma e não
 * acessa nenhuma tela de tenant, então gerencia as PRÓPRIAS credenciais aqui
 * (senha + MFA), contra as mesmas APIs de sessão usadas pelos demais usuários.
 */
export function TabConta() {
  const router = useRouter();
  const { update } = useSession();

  // Troca de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [mfaDisableOpen, setMfaDisableOpen] = useState(false);
  const [mfaSetupStep, setMfaSetupStep] = useState<"scan" | "verify">("scan");
  const [mfaQrDataUrl, setMfaQrDataUrl] = useState("");
  const [mfaSetupTotp, setMfaSetupTotp] = useState("");
  const [mfaDisableTotp, setMfaDisableTotp] = useState("");
  const [mfaDisablePassword, setMfaDisablePassword] = useState("");
  const [mfaSaving, setMfaSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/mfa/status")
      .then((r) => r.json())
      .then((data: { mfaEnabled?: boolean }) => setMfaEnabled(data.mfaEnabled ?? false))
      .catch(() => {})
      .finally(() => setMfaLoading(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    const pwErr = passwordErrorMessage(newPassword);
    if (pwErr) { toast.error(pwErr); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não conferem."); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Erro ao alterar senha."); return;
      }
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Re-sincroniza o token (passwordChangedAt) para a verificação periódica do JWT
      // não derrubar a própria sessão que acabou de alterar a senha.
      await update();
      router.refresh();
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleMfaSetup() {
    setMfaSaving(true);
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      if (!res.ok) { toast.error("Erro ao iniciar configuração de MFA."); return; }
      const data = (await res.json()) as { qrDataUrl: string };
      setMfaQrDataUrl(data.qrDataUrl);
      setMfaSetupStep("scan");
      setMfaSetupOpen(true);
    } catch { toast.error("Erro ao iniciar configuração de MFA."); }
    finally { setMfaSaving(false); }
  }

  async function handleMfaEnable() {
    setMfaSaving(true);
    try {
      const res = await fetch("/api/auth/mfa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totp: mfaSetupTotp }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Código inválido."); return;
      }
      setMfaEnabled(true);
      setMfaSetupOpen(false);
      setMfaSetupTotp("");
      toast.success("Autenticação de dois fatores ativada!");
    } catch { toast.error("Erro ao ativar MFA."); }
    finally { setMfaSaving(false); }
  }

  async function handleMfaDisable() {
    setMfaSaving(true);
    try {
      const res = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totp: mfaDisableTotp, currentPassword: mfaDisablePassword }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "Erro ao desativar MFA."); return;
      }
      setMfaEnabled(false);
      setMfaDisableOpen(false);
      setMfaDisableTotp("");
      setMfaDisablePassword("");
      toast.success("Autenticação de dois fatores desativada.");
    } catch { toast.error("Erro ao desativar MFA."); }
    finally { setMfaSaving(false); }
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Troca de senha */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Alterar senha
          </CardTitle>
          <CardDescription className="text-xs">
            Credenciais de acesso ao cockpit da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <form onSubmit={handleChangePassword} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Senha atual</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Senha atual"
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <Button type="submit" size="sm" disabled={savingPassword} className="gap-1.5 w-fit">
              <KeyRound className="h-3.5 w-3.5" />
              {savingPassword ? "Salvando..." : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* MFA */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Autenticação de dois fatores (MFA)
            </CardTitle>
            {!mfaLoading && (
              <Badge
                variant="outline"
                className={mfaEnabled
                  ? "text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "text-xs text-muted-foreground"}
              >
                {mfaEnabled ? "Ativo" : "Inativo"}
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Camada extra de segurança com um código do Google Authenticator, Authy ou app compatível. Fortemente recomendado para a conta da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          {mfaLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : mfaEnabled ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">MFA ativo — sua conta requer código a cada login.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMfaDisableOpen(true)}
                className="text-destructive border-destructive/30 hover:bg-destructive/5 shrink-0"
              >
                Desativar
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">Proteja sua conta com um segundo fator de autenticação.</p>
              <Button size="sm" onClick={handleMfaSetup} disabled={mfaSaving} className="shrink-0">
                {mfaSaving ? "Aguarde..." : "Configurar"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MFA Setup Dialog */}
      <Dialog open={mfaSetupOpen} onOpenChange={(v) => { setMfaSetupOpen(v); if (!v) { setMfaSetupStep("scan"); setMfaSetupTotp(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Configurar autenticação de dois fatores</DialogTitle>
          </DialogHeader>
          {mfaSetupStep === "scan" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR code com o seu aplicativo autenticador (Google Authenticator, Authy, etc.).
              </p>
              {mfaQrDataUrl && (
                <div className="flex justify-center">
                  <img src={mfaQrDataUrl} alt="QR Code MFA" className="w-48 h-48 rounded-lg border border-border" />
                </div>
              )}
              <Button className="w-full" onClick={() => setMfaSetupStep("verify")}>
                Já escaniei — continuar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Digite o código de 6 dígitos gerado pelo aplicativo para confirmar a configuração.
              </p>
              <div className="grid gap-1.5">
                <Label className="text-xs">Código de verificação</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  className="h-9 text-center text-xl tracking-widest font-mono"
                  value={mfaSetupTotp}
                  onChange={(e) => setMfaSetupTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  autoFocus
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" size="sm" onClick={() => setMfaSetupStep("scan")}>Voltar</Button>
                <Button size="sm" onClick={handleMfaEnable} disabled={mfaSaving || mfaSetupTotp.length !== 6}>
                  {mfaSaving ? "Verificando..." : "Ativar MFA"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MFA Disable Dialog */}
      <Dialog open={mfaDisableOpen} onOpenChange={(v) => { setMfaDisableOpen(v); if (!v) { setMfaDisableTotp(""); setMfaDisablePassword(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Desativar autenticação de dois fatores</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Confirme sua senha e o código TOTP atual para desativar o MFA.
          </p>
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Senha atual</Label>
              <Input
                type="password"
                placeholder="Sua senha"
                className="h-9 text-sm"
                value={mfaDisablePassword}
                onChange={(e) => setMfaDisablePassword(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Código TOTP</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                className="h-9 text-center text-xl tracking-widest font-mono"
                value={mfaDisableTotp}
                onChange={(e) => setMfaDisableTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setMfaDisableOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleMfaDisable}
              disabled={mfaSaving || !mfaDisablePassword || mfaDisableTotp.length !== 6}
            >
              {mfaSaving ? "Desativando..." : "Desativar MFA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
