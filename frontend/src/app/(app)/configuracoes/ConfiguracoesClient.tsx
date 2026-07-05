"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useComunidade, useTermos, useEtapaLabels } from "@/lib/data-store";
import type { GrupoFormacao } from "@/types";
import { passwordErrorMessage } from "@/lib/password-validation";
import type { UserPublic } from "@/lib/users-store";
import {
  PERFIL_USUARIO_LABELS,
  TIPO_ORGANIZACAO_LABELS,
  temPermissao,
  type PerfilUsuario,
  type NivelFormativo,
  type TipoOrganizacao,
  type ComunidadeConfig,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Clipboard,
  Download,
  Eye,
  EyeOff,
  FileText,
  Home,
  ImageIcon,
  Info,
  KeyRound,
  Mail,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Send,
  Server,
  ShieldCheck,
  Shuffle,
  Sprout,
  TrendingUp,
  Trash2,
  Type,
  Upload,
  User,
  UserCog,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import PlanUsage from "@/components/PlanUsage";
import StripeUpgrade from "@/components/StripeUpgrade";
import type { BillingInfo } from "@/lib/billing-data";
import type { UsageInfo } from "@/lib/plan-limits";
import PrivacidadeTab from "@/components/PrivacidadeTab";
import DadosPessoaisCard from "@/components/DadosPessoaisCard";
import { downloadJsonExport } from "@/lib/download-export";
import NotificacoesTab from "@/components/NotificacoesTab";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { THEME_PALETTES, applyThemePalette } from "@/lib/themes";

const VALID_TABS = ["perfil", "usuarios", "comunidade", "email", "plano", "sistema", "notificacoes", "privacidade"];

/** Lê a mensagem de erro de uma resposta sem sucesso de forma resiliente.
 *  Respostas de timeout/gateway (502/504) costumam vir como HTML, não JSON —
 *  nesse caso `res.json()` lançaria e o usuário ficaria sem retorno. */
async function readApiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json() as { error?: string };
    return data.error ?? fallback;
  } catch {
    if (res.status === 504 || res.status === 502 || res.status === 503) {
      return "O servidor demorou a responder. Tente novamente em instantes.";
    }
    return fallback;
  }
}

interface ConfiguracoesClientProps {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userGrupoFormacaoId?: string | null;
  initialGruposFormacao: GrupoFormacao[];
  initialBilling: BillingInfo | null;
  initialUsage: UsageInfo | null;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function ConfiguracoesClient({
  userId,
  userName,
  userEmail,
  userRole,
  userGrupoFormacaoId,
  initialGruposFormacao,
  initialBilling,
  initialUsage,
}: ConfiguracoesClientProps) {
  const isGestao = temPermissao(userRole as PerfilUsuario, "formador_geral");
  // Admin comercial (e super_admin): controla Plano, Sistema e Privacidade.
  const isAdmin = temPermissao(userRole as PerfilUsuario, "administrador");
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab");
  const checkoutParam = searchParams.get("checkout");
  const [activeTab, setActiveTab] = useState(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "perfil"
  );

  useEffect(() => {
    if (checkoutParam === "success") {
      toast.success("Assinatura ativada com sucesso! Bem-vindo ao seu novo plano.");
      router.replace("/configuracoes?tab=plano");
    } else if (checkoutParam === "cancelled") {
      toast.info("Checkout cancelado. Seu plano não foi alterado.");
      router.replace("/configuracoes?tab=plano");
    }
  }, [checkoutParam, router]);

  return (
    <div className="space-y-5 animate-in-fast">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isGestao
            ? "Gerencie usuários, dados da comunidade e preferências do sistema"
            : "Gerencie seu perfil e preferências"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabsList className="bg-muted/50 h-9 min-w-max">
          <TabsTrigger value="perfil" className="text-xs h-7 gap-1.5">
            <User className="h-3.5 w-3.5" />
            Perfil
          </TabsTrigger>
          {isGestao && (
            <TabsTrigger value="usuarios" className="text-xs h-7 gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Usuários
            </TabsTrigger>
          )}
          {isGestao && (
            <TabsTrigger value="comunidade" className="text-xs h-7 gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Comunidade
            </TabsTrigger>
          )}
          {isGestao && (
            <TabsTrigger value="email" className="text-xs h-7 gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              E-mail
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="plano" className="text-xs h-7 gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Plano
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="sistema" className="text-xs h-7 gap-1.5">
              <Server className="h-3.5 w-3.5" />
              Sistema
            </TabsTrigger>
          )}
          <TabsTrigger value="notificacoes" className="text-xs h-7 gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notificações
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="privacidade" className="text-xs h-7 gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Privacidade
            </TabsTrigger>
          )}
        </TabsList>
        </div>

        <TabsContent value="perfil" className="mt-4">
          <PerfilTab userId={userId} userName={userName} userEmail={userEmail} userRole={userRole} isSuperAdmin={userRole === "super_admin"} />
        </TabsContent>

        {isGestao && (
          <TabsContent value="usuarios" className="mt-4">
            <UsuariosTab currentUserId={userId} initialGruposFormacao={initialGruposFormacao} />
          </TabsContent>
        )}

        {isGestao && (
          <TabsContent value="comunidade" className="mt-4">
            <ComunidadeTab />
          </TabsContent>
        )}

        {isGestao && (
          <TabsContent value="email" className="mt-4">
            <EmailTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="plano" className="mt-4">
            <div className="max-w-3xl space-y-6">
              {/* Uso atual */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Uso atual</CardTitle>
                  <CardDescription className="text-xs">
                    Recursos utilizados na sua organização
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5">
                  <PlanUsage initialUsage={initialUsage} />
                </CardContent>
              </Card>

              {/* Planos e upgrade */}
              {userRole === "administrador" && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">Planos disponíveis</CardTitle>
                    <CardDescription className="text-xs">
                      Escolha o plano ideal para o tamanho da sua comunidade
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-6">
                    <StripeUpgrade initialBilling={initialBilling} />
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="sistema" className="mt-4">
            <SistemaTab />
          </TabsContent>
        )}

        <TabsContent value="notificacoes" className="mt-4">
          <NotificacoesTab isGestao={isGestao} userRole={userRole} userGrupoFormacaoId={userGrupoFormacaoId} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="privacidade" className="mt-4">
            <PrivacidadeTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ─── TAB: PERFIL ───────────────────────────────────────────────── */

function PerfilTab({
  userId,
  userName,
  userEmail,
  userRole,
  isSuperAdmin = false,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  isSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const { formador } = useTermos();
  const [usuario, setUsuario] = useState<UserPublic | null>(null);

  // Troca de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // MFA state
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
    fetch("/api/users")
      .then((r) => r.json())
      .then((users: UserPublic[]) => setUsuario(users.find((u) => u.id === userId) ?? null))
      .catch(() => {});
  }, [userId]);

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
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não conferem."); return;
    }
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
      // Re-sincroniza o token (passwordChangedAt) para a verificação periódica do JWT não
      // derrubar a própria sessão que acabou de alterar a senha.
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

  // Rótulo do perfil vem direto da sessão (prop) para evitar flash: antes era
  // derivado de um fetch em /api/users e exibia o fallback genérico ("Formador
  // Comunitário") até a resposta chegar — parecendo dados de outro usuário.
  const perfilLabel = PERFIL_USUARIO_LABELS[userRole as PerfilUsuario] ?? formador;

  return (
    <div className="max-w-lg space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-foreground truncate">{userName}</p>
              <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1.5">
                  <ShieldCheck className="h-3 w-3" />
                  {perfilLabel}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Informações da conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex justify-between items-center py-2 border-b border-border/60">
            <span className="text-sm text-muted-foreground">ID de usuário</span>
            <span className="text-sm font-mono text-foreground">{userId}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/60">
            <span className="text-sm text-muted-foreground">Perfil de acesso</span>
            <span className="text-sm font-medium text-foreground">{perfilLabel}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border/60">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
              Ativo
            </Badge>
          </div>
          {usuario?.criadoEm && (
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">Membro desde</span>
              <span className="text-sm text-foreground">
                {format(parseISO(usuario.criadoEm), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Troca de senha */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            Alterar senha
          </CardTitle>
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
            <Button
              type="submit"
              size="sm"
              disabled={savingPassword}
              className="gap-1.5 w-fit"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {savingPassword ? "Salvando..." : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* MFA card */}
      <Card className="border-0 shadow-sm">
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
            Adicione uma camada extra de segurança com um código gerado pelo Google Authenticator, Authy ou app compatível.
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

      {/* Dados pessoais e exclusão de conta (LGPD) — disponíveis a qualquer usuário */}
      <DadosPessoaisCard userEmail={userEmail} isSuperAdmin={isSuperAdmin} />

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
                <Button
                  size="sm"
                  onClick={handleMfaEnable}
                  disabled={mfaSaving || mfaSetupTotp.length !== 6}
                >
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

/* ─── TAB: USUÁRIOS ─────────────────────────────────────────────── */

type UsuarioForm = {
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  grupoFormacaoId: string;
  grupoFormacaoModo: "existente" | "provisoria";
  nomeProvisorio: string;
  nivelFormativoProvisorio: NivelFormativo;
  ativo: boolean;
  password: string;
  confirmPassword: string;
  gerarSenhaAuto: boolean;
};

const EMPTY_USUARIO_FORM: UsuarioForm = {
  nome: "",
  email: "",
  perfil: "formador_comunitario",
  grupoFormacaoId: "",
  grupoFormacaoModo: "existente",
  nomeProvisorio: "",
  nivelFormativoProvisorio: "pre-discipulado",
  ativo: true,
  password: "",
  confirmPassword: "",
  gerarSenhaAuto: true,
};

function UsuariosTab({ currentUserId, initialGruposFormacao }: { currentUserId: string; initialGruposFormacao: GrupoFormacao[] }) {
  const etapaLabels = useEtapaLabels();
  const { grupoFormacao: termoGrupoFormacao } = useTermos();
  const [usuarios, setUsuarios] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const allMoradas = initialGruposFormacao;
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ nome: "", email: "", perfil: "formador_comunitario", grupoFormacaoId: "" });
  const [inviteSaving, setInviteSaving] = useState(false);
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{
    nome: string;
    email: string;
    password: string;
    emailSent: boolean;
  } | null>(null);
  const [editing, setEditing] = useState<UserPublic | null>(null);
  const [form, setForm] = useState<UsuarioForm>(EMPTY_USUARIO_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data: UserPublic[]) => setUsuarios(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (field: keyof UsuarioForm) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const filtered = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalAtivos = usuarios.filter((u) => u.ativo).length;
  const totalAdmins = usuarios.filter((u) => u.perfil === "administrador").length;
  const totalFormadores = usuarios.filter((u) => u.perfil === "formador_comunitario").length;

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_USUARIO_FORM);
    setShowPassword(false);
    setShowConfirm(false);
    setDialogOpen(true);
  }

  async function handleInvite() {
    if (!inviteForm.nome.trim() || !inviteForm.email.trim()) {
      toast.error("Nome e e-mail são obrigatórios."); return;
    }
    setInviteSaving(true);
    const res = await fetch("/api/convites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    const data = await res.json() as { error?: string; emailSent?: boolean; inviteUrl?: string };
    setInviteSaving(false);
    if (!res.ok) { toast.error(data.error ?? "Falha ao criar convite"); return; }
    setInviteOpen(false);
    setInviteForm({ nome: "", email: "", perfil: "formador_comunitario", grupoFormacaoId: "" });
    if (data.emailSent) {
      toast.success("Convite enviado por e-mail!");
    } else {
      toast.success(`Convite criado. Link: ${data.inviteUrl}`);
    }
  }

  function openEdit(u: UserPublic) {
    setEditing(u);
    setForm({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      grupoFormacaoId: u.grupoFormacaoId ?? "",
      grupoFormacaoModo: "existente",
      nomeProvisorio: "",
      nivelFormativoProvisorio: "pre-discipulado",
      ativo: u.ativo,
      password: "",
      confirmPassword: "",
      gerarSenhaAuto: false,
    });
    setShowPassword(false);
    setShowConfirm(false);
    setDialogOpen(true);
  }

  function openDelete(u: UserPublic) {
    setEditing(u);
    setDeleteOpen(true);
  }

  async function handleToggleAtivo(u: UserPublic) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !u.ativo }),
    });
    if (!res.ok) { toast.error("Falha ao atualizar usuário."); return; }
    const updated: UserPublic = await res.json();
    setUsuarios((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
    toast.success(u.ativo ? "Usuário desativado." : "Usuário ativado.");
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!form.email.trim()) { toast.error("E-mail é obrigatório."); return; }
    if (!editing && !form.gerarSenhaAuto && !form.password) {
      toast.error("Informe uma senha ou ative a geração automática."); return;
    }
    if (!form.gerarSenhaAuto && form.password && form.password !== form.confirmPassword) {
      toast.error("As senhas não conferem."); return;
    }
    if (editing && form.password && form.password !== form.confirmPassword) {
      toast.error("As senhas não conferem."); return;
    }
    if (form.perfil === "formador_comunitario") {
      if (form.grupoFormacaoModo === "existente" && !form.grupoFormacaoId) {
        toast.error("Selecione uma morada ou escolha criar com nome provisório."); return;
      }
      if (form.grupoFormacaoModo === "provisoria" && !form.nomeProvisorio.trim()) {
        toast.error("Informe um nome provisório para a morada."); return;
      }
    }

    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          nome: form.nome.trim(),
          email: form.email.trim(),
          perfil: form.perfil,
          // Administrador não tem morada: envia null para desatribuir explicitamente
          // (undefined seria omitido pelo JSON e manteria o vínculo antigo no banco).
          grupoFormacaoId: form.perfil === "formador_comunitario" ? form.grupoFormacaoId || undefined : null,
          ativo: form.ativo,
        };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/users/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          toast.error(await readApiError(res, "Falha ao atualizar usuário.")); return;
        }
        const updated: UserPublic = await res.json();
        setUsuarios((prev) => prev.map((u) => (u.id === editing.id ? updated : u)));
        toast.success("Usuário atualizado com sucesso!");
        setDialogOpen(false);
      } else {
        const grupoFormacaoIdParaEnviar =
          form.perfil === "formador_comunitario" && form.grupoFormacaoModo === "existente"
            ? form.grupoFormacaoId || undefined
            : undefined;

        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim(),
            password: form.gerarSenhaAuto ? undefined : form.password,
            perfil: form.perfil,
            grupoFormacaoId: grupoFormacaoIdParaEnviar,
            ativo: form.ativo,
          }),
        });
        if (!res.ok) {
          toast.error(await readApiError(res, "Falha ao criar usuário.")); return;
        }
        const created = await res.json() as UserPublic & { tempPassword?: string; emailSent?: boolean };

        // Criar grupo provisório e vincular ao formador via API
        if (form.perfil === "formador_comunitario" && form.grupoFormacaoModo === "provisoria") {
          const grupoRes = await fetch("/api/grupos-formacao", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nome: form.nomeProvisorio.trim(),
              tipo: "estruturado",
              nivelFormativo: form.nivelFormativoProvisorio,
              formadorId: created.id,
            }),
          });
          if (grupoRes.ok) {
            const grupo = await grupoRes.json() as { id: string };
            created.grupoFormacaoId = grupo.id;
          }
        }

        setUsuarios((prev) => [...prev, created]);
        setDialogOpen(false);
        if (created.tempPassword) {
          setTempPasswordDialog({
            nome: created.nome,
            email: created.email,
            password: created.tempPassword,
            emailSent: created.emailSent ?? false,
          });
        } else {
          toast.success("Usuário criado com sucesso!");
        }
      }
    } catch (err) {
      // Rede instável, timeout do gateway ou resposta não-JSON (ex.: 502/504 com
      // página HTML) caem aqui. Sem este catch o usuário ficava sem nenhum retorno.
      console.error("[handleSave usuário]", err);
      toast.error("Não foi possível concluir a operação. Verifique a conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    const res = await fetch(`/api/users/${editing.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Falha ao excluir usuário."); return; }
    setUsuarios((prev) => prev.filter((u) => u.id !== editing.id));
    setDeleteOpen(false);
    setEditing(null);
    toast.success("Usuário excluído.");
  }

  const grupoFormacaoDoFormulario = allMoradas.find((m) => m.id === form.grupoFormacaoId);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: usuarios.length, icon: Users, color: "text-foreground" },
          { label: "Ativos", value: totalAtivos, icon: CheckCircle2, color: "text-emerald-600" },
          { label: "Administradores", value: totalAdmins, icon: ShieldCheck, color: "text-primary" },
          { label: "Formadores", value: totalFormadores, icon: UserCog, color: "text-violet-600" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 shrink-0 ${s.color}`} />
              <div>
                <p className="text-xl font-bold text-foreground leading-tight">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-sm max-w-sm"
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Convidar
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs font-semibold text-muted-foreground">Usuário</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">Perfil</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">{termoGrupoFormacao}</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground hidden lg:table-cell">Desde</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((usuario) => {
              const grupoFormacao = allMoradas.find((m) => m.id === usuario.grupoFormacaoId);
              const isCurrentUser = usuario.id === currentUserId;
              return (
                <TableRow key={usuario.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={`text-xs font-semibold ${
                            usuario.perfil === "administrador"
                              ? "bg-primary/10 text-primary"
                              : "bg-violet-100 text-violet-700"
                          }`}
                        >
                          {getInitials(usuario.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground leading-tight">
                          {usuario.nome}
                          {isCurrentUser && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{usuario.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={`text-xs gap-1 ${
                        usuario.perfil === "administrador"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-violet-50 text-violet-700 border-violet-200"
                      }`}
                    >
                      {usuario.perfil === "administrador" ? (
                        <ShieldCheck className="h-3 w-3" />
                      ) : (
                        <UserCog className="h-3 w-3" />
                      )}
                      {PERFIL_USUARIO_LABELS[usuario.perfil]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {grupoFormacao ? (
                      <span className="flex items-center gap-1">
                        <Home className="h-3 w-3 shrink-0" />
                        {grupoFormacao.nome}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {format(parseISO(usuario.criadoEm), "MMM yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        usuario.ativo
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {usuario.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(usuario)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleAtivo(usuario)}>
                          {usuario.ativo ? (
                            <XCircle className="h-4 w-4 mr-2" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          {usuario.ativo ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => openDelete(usuario)}
                          disabled={isCurrentUser}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>
                Nome completo <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.nome}
                onChange={(e) => set("nome")(e.target.value)}
                placeholder="Nome Sobrenome"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>
                E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                placeholder="usuario@dombosco.org"
              />
            </div>

            {/* Senha — criação */}
            {!editing && (
              <>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Shuffle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Gerar senha automática</p>
                      <p className="text-xs text-muted-foreground">
                        O usuário deverá definir sua própria senha no primeiro acesso
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.gerarSenhaAuto}
                    onClick={() => set("gerarSenhaAuto")(!form.gerarSenhaAuto)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      form.gerarSenhaAuto ? "bg-primary" : "bg-input"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                        form.gerarSenhaAuto ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {!form.gerarSenhaAuto && (
                  <>
                    <div className="grid gap-1.5">
                      <Label>
                        Senha <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={form.password}
                          onChange={(e) => set("password")(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>
                        Confirmar senha <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          type={showConfirm ? "text" : "password"}
                          value={form.confirmPassword}
                          onChange={(e) => set("confirmPassword")(e.target.value)}
                          placeholder="Repita a senha"
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Senha — edição */}
            {editing && (
              <>
                <div className="grid gap-1.5">
                  <Label>
                    Senha{" "}
                    <span className="text-muted-foreground font-normal">(deixe em branco para manter)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => set("password")(e.target.value)}
                      placeholder="Nova senha (opcional)"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {form.password && (
                  <div className="grid gap-1.5">
                    <Label>Confirmar senha</Label>
                    <div className="relative">
                      <Input
                        type={showConfirm ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(e) => set("confirmPassword")(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="grid gap-1.5">
              <Label>Perfil de acesso</Label>
              <Select value={form.perfil} onValueChange={(v) => v && set("perfil")(v)} items={{ administrador: PERFIL_USUARIO_LABELS.administrador, formador_geral: PERFIL_USUARIO_LABELS.formador_geral, formador_comunitario: PERFIL_USUARIO_LABELS.formador_comunitario }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">
                    {PERFIL_USUARIO_LABELS["administrador"]}
                  </SelectItem>
                  <SelectItem value="formador_geral">
                    {PERFIL_USUARIO_LABELS["formador_geral"]}
                  </SelectItem>
                  <SelectItem value="formador_comunitario">
                    {PERFIL_USUARIO_LABELS["formador_comunitario"]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.perfil === "formador_comunitario" && (
              <div className="grid gap-3">
                {!editing && (
                  <div className="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      onClick={() => set("grupoFormacaoModo")("existente")}
                      className={`flex-1 py-2 px-3 text-xs font-medium transition-colors ${
                        form.grupoFormacaoModo === "existente"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Selecionar existente
                    </button>
                    <button
                      type="button"
                      onClick={() => set("grupoFormacaoModo")("provisoria")}
                      className={`flex-1 py-2 px-3 text-xs font-medium transition-colors border-l border-border ${
                        form.grupoFormacaoModo === "provisoria"
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      Criar com nome provisório
                    </button>
                  </div>
                )}

                {form.grupoFormacaoModo === "existente" ? (
                  <div className="grid gap-1.5">
                    <Label>
                      {termoGrupoFormacao} vinculado <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.grupoFormacaoId}
                      onValueChange={(v) => v && set("grupoFormacaoId")(v)}
                      items={Object.fromEntries(allMoradas.filter((m) => m.ativo).map((m) => [m.id, m.nivelFormativo ? `${m.nome} — ${etapaLabels[m.nivelFormativo]}` : m.nome]))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a morada..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allMoradas
                          .filter((m) => m.ativo)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nivelFormativo ? `${m.nome} — ${etapaLabels[m.nivelFormativo]}` : m.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {grupoFormacaoDoFormulario && (
                      <p className="text-xs text-muted-foreground">
                        {grupoFormacaoDoFormulario.nivelFormativo
                          ? `Nível: ${etapaLabels[grupoFormacaoDoFormulario.nivelFormativo]}`
                          : "Grupo Livre"}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid gap-1.5">
                      <Label>
                        Nome provisório <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.nomeProvisorio}
                        onChange={(e) => set("nomeProvisorio")(e.target.value)}
                        placeholder={`Ex: ${termoGrupoFormacao} do João`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Pode ser ajustado depois no CRUD de Moradas.
                      </p>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>
                        Etapa formativa <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.nivelFormativoProvisorio}
                        onValueChange={(v) => v && set("nivelFormativoProvisorio")(v)}
                        items={etapaLabels}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["pre-discipulado", "discipulado", "primeiras-promessas", "formacao-permanente"] as NivelFormativo[]).map((n) => (
                            <SelectItem key={n} value={n}>
                              {etapaLabels[n]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}
            {editing && (
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">Usuário ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Usuários inativos não conseguem fazer login
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.ativo}
                  onClick={() => set("ativo")(!form.ativo)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    form.ativo ? "bg-primary" : "bg-input"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                      form.ativo ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir usuário</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{editing?.nome}</span>? Esta ação
            não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Senha Temporária Dialog */}
      <Dialog
        open={!!tempPasswordDialog}
        onOpenChange={(open) => { if (!open) setTempPasswordDialog(null); }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Usuário criado com sucesso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O utilizador{" "}
              <span className="font-medium text-foreground">{tempPasswordDialog?.nome}</span>{" "}
              foi criado com sucesso.
            </p>

            {/* Email sent indicator */}
            {tempPasswordDialog?.emailSent ? (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-700">
                  E-mail de boas-vindas enviado para{" "}
                  <span className="font-medium">{tempPasswordDialog.email}</span> com as
                  credenciais e instruções de acesso.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  E-mail de boas-vindas não enviado (SMTP não configurado). Partilhe
                  manualmente as credenciais abaixo.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">E-mail de acesso</p>
              <p className="text-sm font-medium text-foreground">{tempPasswordDialog?.email}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs text-primary/70 mb-1">Senha provisória de primeiro acesso</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-base font-mono font-bold text-primary tracking-widest">
                  {tempPasswordDialog?.password}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (tempPasswordDialog?.password) {
                      navigator.clipboard.writeText(tempPasswordDialog.password);
                      toast.success("Senha copiada!");
                    }
                  }}
                  className="shrink-0 rounded-md p-1.5 text-primary/70 hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Copiar senha"
                >
                  <Clipboard className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
              <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700">
                Esta senha é exibida apenas uma vez. O utilizador deverá alterá-la no primeiro login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPasswordDialog(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convidar usuário Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convidar usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-xs text-muted-foreground">
              Um link de ativação será gerado (válido por 48h). Se SMTP estiver configurado, o e-mail é enviado automaticamente.
            </p>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome</label>
              <Input
                placeholder="Nome completo"
                value={inviteForm.nome}
                onChange={(e) => setInviteForm((f) => ({ ...f, nome: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Perfil</label>
              <Select
                value={inviteForm.perfil}
                onValueChange={(v) => v && setInviteForm((f) => ({ ...f, perfil: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formador_comunitario">Formador Comunitário</SelectItem>
                  <SelectItem value="formador_geral">Formador Geral</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {inviteForm.perfil === "formador_comunitario" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{termoGrupoFormacao} (opcional)</label>
                <Select
                  value={inviteForm.grupoFormacaoId || "none"}
                  onValueChange={(v) => v && setInviteForm((f) => ({ ...f, grupoFormacaoId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar morada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {allMoradas.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteSaving}>
              {inviteSaving ? "Enviando..." : "Enviar convite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── TAB: COMUNIDADE ───────────────────────────────────────────── */

const MAX_LOGO_BYTES = 1_048_576; // 1 MB

function ComunidadeTab() {
  const router = useRouter();
  const [comunidade, setComunidade] = useComunidade();
  const etapaLabels = useEtapaLabels();
  const [form, setForm] = useState<ComunidadeConfig>(() => ({ ...comunidade }));
  const [dirty, setDirty] = useState(false);

  const [logo, setLogo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [themeKey, setThemeKey] = useState<string>("azul");

  // Sync logo and theme from DB once the API responds
  useEffect(() => {
    setLogo(comunidade.logoUrl ?? null);
    setThemeKey(comunidade.temaCor ?? "azul");
  }, [comunidade.logoUrl, comunidade.temaCor]);

  function handleChange(field: keyof ComunidadeConfig, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome da comunidade é obrigatório.");
    try {
      await setComunidade({ ...form, logoUrl: logo ?? undefined, temaCor: themeKey });
      setDirty(false);
      router.refresh();
      toast.success("Configurações da comunidade salvas!");
    } catch {
      toast.error("Erro ao salvar configurações. Tente novamente.");
    }
  }

  function handleReset() {
    setForm({ ...comunidade });
    setDirty(false);
  }

  function processLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas (PNG, JPG, SVG, WebP).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("A imagem deve ter no máximo 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setLogo(base64);
      setComunidade({ ...comunidade, logoUrl: base64 });
      router.refresh();
      toast.success("Logo atualizada com sucesso!");
    };
    reader.readAsDataURL(file);
  }

  function handleLogoInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processLogoFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processLogoFile(file);
  }

  function removeLogo() {
    setLogo(null);
    // Envia logoUrl como string vazia — a API converte para null no banco
    setComunidade({ ...comunidade, logoUrl: "" });
    router.refresh();
    toast.success("Logo removida.");
  }

  function handleThemeSelect(key: string) {
    setThemeKey(key);
    applyThemePalette(key);
    setComunidade({ ...comunidade, temaCor: key });
    toast.success(`Tema "${THEME_PALETTES.find((p) => p.key === key)?.label}" aplicado!`);
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Dados da Comunidade */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Dados da Comunidade</CardTitle>
          <CardDescription className="text-xs">
            Informações exibidas nos documentos e relatórios do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="grid gap-1.5">
            <Label>
              Nome da comunidade <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              placeholder="Nome oficial da comunidade"
            />
          </div>

          {comunidade.tipoOrganizacao && (
            <div className="grid gap-1.5">
              <Label>Tipo de organização</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-muted/50 text-foreground border-border font-normal px-2.5 py-1">
                  {TIPO_ORGANIZACAO_LABELS[comunidade.tipoOrganizacao as TipoOrganizacao]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Definido no cadastro. Para alterar, entre em contato com o suporte.
              </p>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>
              Nome da plataforma{" "}
              <span className="font-normal text-muted-foreground text-xs">(opcional)</span>
            </Label>
            <Input
              value={form.nomePlataforma ?? ""}
              onChange={(e) => handleChange("nomePlataforma", e.target.value)}
              placeholder="Ex.: Portal Formativo da Diocese, Plataforma de Formação"
            />
            <p className="text-xs text-muted-foreground">
              Como a sua instância aparece para os usuários. Se não preenchido, usa o nome da comunidade.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label>Missão</Label>
            <Textarea
              value={form.missao}
              onChange={(e) => handleChange("missao", e.target.value)}
              placeholder="Declaração de missão da comunidade..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => handleChange("descricao", e.target.value)}
              placeholder="Breve descrição da comunidade..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Endereço / Sede</Label>
              <Input
                value={form.endereco}
                onChange={(e) => handleChange("endereco", e.target.value)}
                placeholder="Cidade, Estado — País"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Ano de fundação</Label>
              <Input
                value={form.anoFundacao}
                onChange={(e) => handleChange("anoFundacao", e.target.value)}
                placeholder="Ex: 2000"
                maxLength={4}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Instagram</Label>
              <Input
                value={form.instagramHandle ?? ""}
                onChange={(e) => handleChange("instagramHandle", e.target.value)}
                placeholder="@suacomunidade"
              />
              <p className="text-xs text-muted-foreground">
                Sugerido aos vocacionados ao compartilhar a Travessia no Instagram.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>YouTube</Label>
              <Input
                value={form.youtubeUrl ?? ""}
                onChange={(e) => handleChange("youtubeUrl", e.target.value)}
                placeholder="https://youtube.com/@suacomunidade"
              />
              <p className="text-xs text-muted-foreground">
                Canal da comunidade (usado na evangelização da Travessia).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terminologia */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            Terminologia
          </CardTitle>
          <CardDescription className="text-xs">
            Personalize os nomes exibidos na interface para adaptar a plataforma à sua comunidade.
            Deixe em branco para usar os termos padrão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pb-6">

          <div className="grid gap-2">
            <Label>
              Grupo de formação{" "}
              <span className="font-normal text-muted-foreground text-xs">(padrão: "Grupo de Formação")</span>
            </Label>
            <Input
              value={form.termoGrupoFormacao ?? ""}
              onChange={(e) => handleChange("termoGrupoFormacao", e.target.value)}
              placeholder="Grupo de Formação"
              className="max-w-xs h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Exibido na navegação, títulos de página e formulários.
              Ex.: Grupo, Célula, Casa, Comunidade.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>
              Membro do grupo{" "}
              <span className="font-normal text-muted-foreground text-xs">(padrão: "Formando")</span>
            </Label>
            <Input
              value={form.termoFormando ?? ""}
              onChange={(e) => handleChange("termoFormando", e.target.value)}
              placeholder="Formando"
              className="max-w-xs h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Ex.: Membro, Participante, Discípulo, Jovem.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>
              Responsável pelo grupo{" "}
              <span className="font-normal text-muted-foreground text-xs">(padrão: "Formador Comunitário")</span>
            </Label>
            <Input
              value={form.termoFormador ?? ""}
              onChange={(e) => handleChange("termoFormador", e.target.value)}
              placeholder="Formador Comunitário"
              className="max-w-xs h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Exibido no perfil e na gestão de utilizadores.
              Ex.: Líder, Coordenador, Responsável.
            </p>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Etapas formativas</p>
            <p className="text-xs text-muted-foreground -mt-1">
              Nomes das 4 etapas do percurso formativo exibidos nos comboboxes e filtros.
            </p>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="grid gap-1.5">
                <Label>
                  1.ª etapa{" "}
                  <span className="font-normal text-muted-foreground text-xs">(padrão: "Pré-Discipulado")</span>
                </Label>
                <Input
                  value={form.termoPreDiscipulado ?? ""}
                  onChange={(e) => handleChange("termoPreDiscipulado", e.target.value)}
                  placeholder="Pré-Discipulado"
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  2.ª etapa{" "}
                  <span className="font-normal text-muted-foreground text-xs">(padrão: "Discipulado")</span>
                </Label>
                <Input
                  value={form.termoDiscipulado ?? ""}
                  onChange={(e) => handleChange("termoDiscipulado", e.target.value)}
                  placeholder="Discipulado"
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  3.ª etapa{" "}
                  <span className="font-normal text-muted-foreground text-xs">(padrão: "Primeiras Promessas")</span>
                </Label>
                <Input
                  value={form.termoPrimeirasPromessas ?? ""}
                  onChange={(e) => handleChange("termoPrimeirasPromessas", e.target.value)}
                  placeholder="Primeiras Promessas"
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  4.ª etapa{" "}
                  <span className="font-normal text-muted-foreground text-xs">(padrão: "Formação Permanente")</span>
                </Label>
                <Input
                  value={form.termoFormacaoPermanente ?? ""}
                  onChange={(e) => handleChange("termoFormacaoPermanente", e.target.value)}
                  placeholder="Formação Permanente"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Prévia */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5">
            <p className="text-xs font-medium text-muted-foreground">Prévia na navegação</p>
            <div className="flex flex-wrap gap-2">
              {[
                { emoji: "🏠", label: `${form.termoGrupoFormacao?.trim() || "Grupo de Formação"}s` },
                { emoji: "👥", label: `${form.termoFormando?.trim() || "Formando"}s` },
              ].map(({ emoji, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-sm"
                >
                  <span>{emoji}</span>
                  {label}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              O plural é formado adicionando "s" ao termo configurado.
            </p>
          </div>

        </CardContent>
      </Card>

      {/* Período Vocacional */}
      {(() => {
        const isCanonical =
          comunidade.tipoOrganizacao === "nova_comunidade" ||
          comunidade.tipoOrganizacao === "instituto_religioso";
        const habilitado = isCanonical || form.vocacionalHabilitado === true;
        return (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sprout className="h-4 w-4 text-muted-foreground" />
                Período Vocacional
              </CardTitle>
              <CardDescription className="text-xs">
                Período formativo prévio e opcional, ofertado a membros não formais para discernimento.
                Habilitá-lo também libera o Livro de Registro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pb-6">
              {isCanonical ? (
                <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/30 p-3">
                  Sua organização já tem o módulo disponível por padrão.
                </p>
              ) : (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.vocacionalHabilitado === true}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, vocacionalHabilitado: e.target.checked }));
                      setDirty(true);
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-border"
                  />
                  <span className="text-sm text-foreground">
                    Habilitar o módulo Período Vocacional nesta organização
                    <span className="block text-xs text-muted-foreground">
                      Adiciona o item “Período Vocacional” e o Livro de Registro ao menu.
                    </span>
                  </span>
                </label>
              )}

              {habilitado && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label>
                      Nome do período{" "}
                      <span className="font-normal text-muted-foreground text-xs">(padrão: "Período Vocacional")</span>
                    </Label>
                    <Input
                      value={form.termoVocacional ?? ""}
                      onChange={(e) => handleChange("termoVocacional", e.target.value)}
                      placeholder="Período Vocacional"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>
                      Nome do acompanhamento individual{" "}
                      <span className="font-normal text-muted-foreground text-xs">(padrão: "Acompanhamento Vocacional")</span>
                    </Label>
                    <Input
                      value={form.termoAcompanhamentoVocacional ?? ""}
                      onChange={(e) => handleChange("termoAcompanhamentoVocacional", e.target.value)}
                      placeholder="Acompanhamento Vocacional"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>
                      Duração padrão (meses){" "}
                      <span className="font-normal text-muted-foreground text-xs">(canônico: até 12)</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={form.vocacionalDuracaoPadraoMeses ?? 12}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setForm((prev) => ({ ...prev, vocacionalDuracaoPadraoMeses: Number.isNaN(n) ? undefined : n }));
                        setDirty(true);
                      }}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Comunicação — e-mail de agenda */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Comunicação por e-mail
          </CardTitle>
          <CardDescription className="text-xs">
            Controle os e-mails de agenda enviados aos formandos. As notificações no app (sino) e o push
            continuam funcionando normalmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.emailAgendamentoAtivo !== false}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, emailAgendamentoAtivo: e.target.checked }));
                setDirty(true);
              }}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-foreground">
              Enviar e-mails de agenda aos formandos
              <span className="block text-xs text-muted-foreground">
                Inclui o e-mail ao criar um encontro e os lembretes automáticos (24h e 2h antes), com
                convite de calendário e confirmação de presença.
              </span>
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        {dirty && (
          <Button variant="outline" size="sm" onClick={handleReset}>
            Descartar
          </Button>
        )}
        <Button size="sm" onClick={handleSave} disabled={!dirty} className="gap-1.5">
          <Save className="h-3.5 w-3.5" />
          Salvar alterações
        </Button>
      </div>

      {/* Logo */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            Logo da Comunidade
          </CardTitle>
          <CardDescription className="text-xs">
            Exibida no menu lateral do aplicativo. PNG, JPG, SVG ou WebP — máximo 1 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          {logo ? (
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 rounded-xl border border-border bg-muted/30 overflow-hidden">
                <img src={logo} alt="Logo" className="h-full w-full object-contain p-1" />
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Logo atual</p>
                <div className="flex gap-2">
                  <Label
                    htmlFor="logo-input-replace"
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="h-3 w-3" />
                    Trocar
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeLogo}
                    className="h-8 text-xs gap-1.5 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                    Remover
                  </Button>
                </div>
                <input
                  id="logo-input-replace"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="sr-only"
                  onChange={handleLogoInput}
                />
              </div>
            </div>
          ) : (
            <div>
              <label
                htmlFor="logo-input-new"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    Clique para enviar ou arraste aqui
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    PNG, JPG, SVG, WebP — máximo 1 MB
                  </p>
                </div>
              </label>
              <input
                id="logo-input-new"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="sr-only"
                onChange={handleLogoInput}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tema de Cores */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            Cor do Tema
          </CardTitle>
          <CardDescription className="text-xs">
            Personaliza a cor principal da interface. Aplicado imediatamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="flex flex-wrap gap-4">
            {THEME_PALETTES.map((palette) => {
              const active = themeKey === palette.key;
              return (
                <button
                  key={palette.key}
                  type="button"
                  onClick={() => handleThemeSelect(palette.key)}
                  className="flex flex-col items-center gap-1.5 group"
                  title={palette.label}
                >
                  <span
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all ring-offset-2 ring-offset-background ${
                      active ? "ring-2 ring-foreground scale-110" : "hover:scale-105 hover:ring-2 hover:ring-border"
                    }`}
                    style={{ backgroundColor: palette.preview }}
                  >
                    {active && (
                      <CheckCircle2
                        className="h-4 w-4"
                        style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
                      />
                    )}
                  </span>
                  <span
                    className={`text-xs transition-colors ${
                      active ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    {palette.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── TAB: E-MAIL ───────────────────────────────────────────────── */

/**
 * Envio centralizado via Resend (plataforma). A configuração de SMTP por tenant
 * fica oculta por padrão — código mantido para clientes enterprise, que podem
 * reexibir a UI definindo NEXT_PUBLIC_SMTP_UI=1.
 */
const SMTP_UI_ENABLED = process.env.NEXT_PUBLIC_SMTP_UI === "1";

const SMTP_PRESETS = [
  { label: "Gmail", host: "smtp.gmail.com", port: 587, secure: false },
  { label: "Outlook / Office 365", host: "smtp.office365.com", port: 587, secure: false },
  { label: "Yahoo Mail", host: "smtp.mail.yahoo.com", port: 465, secure: true },
] as const;

type SmtpForm = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

type TemplateStep = { titulo: string; descricao: string };

type EmailTemplateForm = {
  assunto: string;
  saudacao: string;
  mensagem1: string;
  mensagem2: string;
  passos: TemplateStep[];
  textoBotao: string;
  avisoSeguranca: string;
  rodape: string;
};

const TEMPLATE_VARS = [
  { label: "{{primeiroNome}}", hint: "Primeiro nome" },
  { label: "{{nome}}", hint: "Nome completo" },
  { label: "{{email}}", hint: "E-mail de acesso" },
  { label: "{{senha}}", hint: "Senha provisória" },
  { label: "{{url}}", hint: "URL da plataforma" },
];

function EmailTab() {
  const [form, setForm] = useState<SmtpForm>({
    host: "", port: 587, secure: false, user: "", pass: "", from: "",
  });
  const [hasExistingPass, setHasExistingPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [testError, setTestError] = useState("");

  // Template editor state
  const [tmpl, setTmpl] = useState<EmailTemplateForm>({
    assunto: "", saudacao: "", mensagem1: "", mensagem2: "",
    passos: [], textoBotao: "", avisoSeguranca: "", rodape: "",
  });
  const [tmplLoading, setTmplLoading] = useState(true);
  const [tmplSaving, setTmplSaving] = useState(false);
  const [tmplDirty, setTmplDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetch("/api/config/smtp")
      .then((r) => r.json())
      .then((data: SmtpForm & { configured: boolean }) => {
        const passSet = data.pass === "***";
        setHasExistingPass(passSet);
        setForm({
          host: data.host ?? "",
          port: data.port ?? 587,
          secure: data.secure ?? false,
          user: data.user ?? "",
          pass: "",
          from: data.from ?? "",
        });
        setTestEmail(data.user ?? "");
        setConfigured(data.configured ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/config/email-template")
      .then((r) => r.json())
      .then((data: EmailTemplateForm) => {
        setTmpl({
          assunto: data.assunto ?? "",
          saudacao: data.saudacao ?? "",
          mensagem1: data.mensagem1 ?? "",
          mensagem2: data.mensagem2 ?? "",
          passos: data.passos ?? [],
          textoBotao: data.textoBotao ?? "",
          avisoSeguranca: data.avisoSeguranca ?? "",
          rodape: data.rodape ?? "",
        });
      })
      .catch(() => {})
      .finally(() => setTmplLoading(false));
  }, []);

  function setField<K extends keyof SmtpForm>(key: K, value: SmtpForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyPreset(preset: (typeof SMTP_PRESETS)[number]) {
    setForm((prev) => ({ ...prev, host: preset.host, port: preset.port, secure: preset.secure }));
  }

  async function handleSave() {
    if (!form.host.trim()) { toast.error("Informe o servidor SMTP (host)."); return; }
    if (!form.user.trim()) { toast.error("Informe o utilizador SMTP."); return; }
    if (!form.pass && !hasExistingPass) { toast.error("Informe a senha SMTP."); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/config/smtp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pass: form.pass || "***",
        }),
      });
      const data = await res.json() as { ok?: boolean; configured?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Falha ao salvar."); return; }
      setConfigured(data.configured ?? false);
      if (form.pass) setHasExistingPass(true);
      setForm((prev) => ({ ...prev, pass: "" }));
      toast.success("Configuração SMTP salva com sucesso!");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestError("");
    try {
      const res = await fetch("/api/config/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setTestResult("error");
        setTestError(data.error ?? "Erro desconhecido");
      } else {
        setTestResult("success");
      }
    } catch (err) {
      setTestResult("error");
      setTestError(String(err));
    } finally {
      setTesting(false);
    }
  }

  function setTmplField<K extends keyof EmailTemplateForm>(key: K, value: EmailTemplateForm[K]) {
    setTmpl((prev) => ({ ...prev, [key]: value }));
    setTmplDirty(true);
    setShowPreview(false);
  }

  function updateStep(index: number, field: keyof TemplateStep, value: string) {
    setTmpl((prev) => ({
      ...prev,
      passos: prev.passos.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
    setTmplDirty(true);
    setShowPreview(false);
  }

  function addStep() {
    setTmpl((prev) => ({ ...prev, passos: [...prev.passos, { titulo: "", descricao: "" }] }));
    setTmplDirty(true);
    setShowPreview(false);
  }

  function removeStep(index: number) {
    setTmpl((prev) => ({ ...prev, passos: prev.passos.filter((_, i) => i !== index) }));
    setTmplDirty(true);
    setShowPreview(false);
  }

  async function handleSaveTemplate() {
    setTmplSaving(true);
    try {
      const res = await fetch("/api/config/email-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tmpl),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Falha ao salvar."); return; }
      setTmplDirty(false);
      toast.success("Texto do e-mail guardado com sucesso!");
    } finally {
      setTmplSaving(false);
    }
  }

  async function handleResetTemplate() {
    const res = await fetch("/api/config/email-template", { method: "DELETE" });
    if (!res.ok) { toast.error("Falha ao repor o texto."); return; }
    const defaults = await fetch("/api/config/email-template").then((r) => r.json()) as EmailTemplateForm;
    setTmpl(defaults);
    setTmplDirty(false);
    setShowPreview(false);
    toast.success("Texto reposto para os valores predefinidos.");
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setShowPreview(false);
    try {
      const res = await fetch("/api/config/email-template/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: tmpl }),
      });
      if (!res.ok) { toast.error("Falha ao gerar pré-visualização."); return; }
      const html = await res.text();
      setPreviewHtml(html);
      setShowPreview(true);
    } finally {
      setPreviewLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        A carregar configuração...
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">

      {SMTP_UI_ENABLED && (
      <>
      {/* Status */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
              configured ? "bg-emerald-100" : "bg-amber-100"
            }`}>
              {configured
                ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                : <AlertTriangle className="h-5 w-5 text-amber-600" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {configured ? "SMTP configurado" : "SMTP não configurado"}
              </p>
              <p className="text-xs text-muted-foreground">
                {configured
                  ? "O envio de e-mails está ativo. Utilize o teste abaixo para verificar a ligação."
                  : "Preencha os dados abaixo para ativar o envio automático de e-mails."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config form */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Servidor de Saída (SMTP)
          </CardTitle>
          <CardDescription className="text-xs">
            Dados fornecidos pelo seu provedor de e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5 space-y-4">

          {/* Presets */}
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Provedor comum</Label>
            <div className="flex flex-wrap gap-2">
              {SMTP_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Preenche automaticamente o servidor, a porta e a segurança.
            </p>
          </div>

          {/* Host + Port + Secure */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div className="grid gap-1.5">
              <Label>
                Servidor (host) <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.host}
                onChange={(e) => setField("host", e.target.value)}
                placeholder="smtp.seuservidor.com"
                className="h-9 text-sm"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Porta</Label>
              <Input
                type="number"
                value={form.port}
                onChange={(e) => setField("port", Number(e.target.value))}
                className="h-9 text-sm w-20"
                min={1}
                max={65535}
              />
            </div>
          </div>

          {/* Security toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">SSL/TLS direto</p>
              <p className="text-xs text-muted-foreground">
                {form.secure
                  ? "Conexão criptografada desde o início (porta 465)"
                  : "STARTTLS — negocia criptografia após conexão (porta 587)"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.secure}
              onClick={() => setField("secure", !form.secure)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                form.secure ? "bg-primary" : "bg-input"
              }`}
            >
              <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                form.secure ? "translate-x-4" : "translate-x-0"
              }`} />
            </button>
          </div>

          {/* User */}
          <div className="grid gap-1.5">
            <Label>
              Utilizador <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.user}
              onChange={(e) => setField("user", e.target.value)}
              placeholder="seuemail@dominio.com"
              className="h-9 text-sm"
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="grid gap-1.5">
            <Label>
              Senha <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                value={form.pass}
                onChange={(e) => setField("pass", e.target.value)}
                placeholder={hasExistingPass ? "Deixe vazio para manter a senha atual" : "Senha do servidor SMTP"}
                className="h-9 text-sm pr-9"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {hasExistingPass && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Senha já configurada — preencha apenas para alterar.
              </p>
            )}
          </div>

          {/* From */}
          <div className="grid gap-1.5">
            <Label>Remetente</Label>
            <Input
              value={form.from}
              onChange={(e) => setField("from", e.target.value)}
              placeholder='Nome Exibido <email@dominio.com>'
              className="h-9 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Nome e e-mail exibidos no campo "De:" dos e-mails enviados. Se vazio, usa o Utilizador.
            </p>
          </div>

          <div className="pt-1">
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {saving ? "A guardar..." : "Guardar configuração"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            Testar Conexão
          </CardTitle>
          <CardDescription className="text-xs">
            Envia um e-mail de teste para confirmar que o servidor está funcionando.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5 space-y-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">E-mail de destino</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => { setTestEmail(e.target.value); setTestResult(null); }}
              placeholder="destino@dominio.com"
              className="h-9 text-sm"
            />
          </div>

          <Button
            onClick={handleTest}
            disabled={testing || !configured}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <Send className="h-3.5 w-3.5" />
            {testing ? "A enviar..." : "Enviar e-mail de teste"}
          </Button>

          {!configured && (
            <p className="text-xs text-muted-foreground">
              Guarde a configuração primeiro para activar o teste.
            </p>
          )}

          {testResult === "success" && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-700">
                E-mail de teste enviado com sucesso! Verifique a caixa de entrada de{" "}
                <span className="font-medium">{testEmail}</span>.
              </p>
            </div>
          )}

          {testResult === "error" && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-destructive">Falha na conexão</p>
                <p className="text-xs text-destructive/80 mt-0.5 break-all">{testError}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Para Gmail, use uma{" "}
              <span className="font-medium text-foreground">App Password</span>
              {" "}(Conta Google → Segurança → Senhas de app). A senha normal não funciona com SMTP externo.
            </p>
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* Template editor */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Texto do E-mail de Boas-Vindas
            {tmplDirty && (
              <span className="ml-auto text-xs font-normal text-amber-600 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                Alterações não guardadas
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            Personalize o conteúdo do e-mail enviado ao formador comunitário no momento do cadastro.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5 space-y-4">

          {tmplLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">A carregar...</p>
          ) : (
            <>
              {/* Variable chips */}
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <p className="text-xs font-medium text-foreground mb-2">Variáveis disponíveis</p>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARS.map((v) => (
                    <span
                      key={v.label}
                      title={v.hint}
                      className="inline-flex items-center rounded border border-border bg-background px-2 py-0.5 font-mono text-xs text-primary cursor-default select-all"
                    >
                      {v.label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Clique numa variável para seleccioná-la e copie-a para qualquer campo de texto abaixo.
                </p>
              </div>

              {/* Assunto */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Assunto</Label>
                <Input
                  value={tmpl.assunto}
                  onChange={(e) => setTmplField("assunto", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Saudação */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Saudação</Label>
                <Input
                  value={tmpl.saudacao}
                  onChange={(e) => setTmplField("saudacao", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Olá, {{primeiroNome}}!"
                />
              </div>

              {/* Mensagem 1 */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Primeiro parágrafo</Label>
                <Textarea
                  value={tmpl.mensagem1}
                  onChange={(e) => setTmplField("mensagem1", e.target.value)}
                  className="text-sm min-h-[80px] resize-y"
                />
              </div>

              {/* Mensagem 2 */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Segundo parágrafo</Label>
                <Textarea
                  value={tmpl.mensagem2}
                  onChange={(e) => setTmplField("mensagem2", e.target.value)}
                  className="text-sm min-h-[80px] resize-y"
                />
              </div>

              {/* Steps */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Passos de instrução</Label>
                  <button
                    type="button"
                    onClick={addStep}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar passo
                  </button>
                </div>
                {tmpl.passos.map((step, i) => (
                  <div key={i} className="grid gap-1.5 rounded-lg border border-border p-3 relative">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-muted-foreground">Passo {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeStep(i)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        disabled={tmpl.passos.length <= 1}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      value={step.titulo}
                      onChange={(e) => updateStep(i, "titulo", e.target.value)}
                      placeholder="Título do passo"
                      className="h-8 text-sm"
                    />
                    <Textarea
                      value={step.descricao}
                      onChange={(e) => updateStep(i, "descricao", e.target.value)}
                      placeholder="Descrição do passo"
                      className="text-sm min-h-[60px] resize-none"
                    />
                  </div>
                ))}
              </div>

              {/* Button text */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Texto do botão</Label>
                <Input
                  value={tmpl.textoBotao}
                  onChange={(e) => setTmplField("textoBotao", e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Acessar a Plataforma"
                />
              </div>

              {/* Security notice */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Aviso de segurança</Label>
                <Textarea
                  value={tmpl.avisoSeguranca}
                  onChange={(e) => setTmplField("avisoSeguranca", e.target.value)}
                  className="text-sm min-h-[60px] resize-y"
                />
              </div>

              {/* Footer */}
              <div className="grid gap-1.5">
                <Label className="text-xs">Rodapé</Label>
                <Input
                  value={tmpl.rodape}
                  onChange={(e) => setTmplField("rodape", e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button onClick={handleSaveTemplate} disabled={tmplSaving} size="sm" className="gap-1.5">
                  <Save className="h-3.5 w-3.5" />
                  {tmplSaving ? "A guardar..." : "Guardar texto"}
                </Button>
                <Button
                  onClick={handlePreview}
                  disabled={previewLoading}
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {previewLoading ? "A gerar..." : showPreview ? "Actualizar pré-visualização" : "Pré-visualizar"}
                </Button>
                <Button
                  onClick={handleResetTemplate}
                  size="sm"
                  variant="ghost"
                  className="gap-1.5 text-muted-foreground ml-auto"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Repor predefinições
                </Button>
              </div>

              {/* Preview iframe */}
              {showPreview && previewHtml && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="flex items-center justify-between bg-muted/40 px-3 py-2 border-b border-border">
                    <span className="text-xs font-medium text-foreground">Pré-visualização do e-mail</span>
                    <button
                      type="button"
                      onClick={() => setShowPreview(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <iframe
                    srcDoc={previewHtml}
                    title="Pré-visualização do e-mail"
                    className="w-full border-0"
                    style={{ height: "600px" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── TAB: SISTEMA ──────────────────────────────────────────────── */

function SistemaTab() {
  async function handleExport() {
    try {
      const ok = await downloadJsonExport(
        "/api/export/organizacao",
        `formattio-backup-${new Date().toISOString().split("T")[0]}.json`,
      );
      toast[ok ? "success" : "error"](ok ? "Dados exportados com sucesso!" : "Falha ao exportar dados.");
    } catch {
      toast.error("Falha ao exportar dados.");
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* App info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Server className="h-4 w-4 text-muted-foreground" />
            Informações do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-0">
          {[
            { label: "Aplicativo", value: "Formattio" },
            { label: "Versão do schema", value: "3" },
            { label: "Ambiente", value: "Produção" },
            { label: "Armazenamento", value: "PostgreSQL (servidor)" },
            { label: "Autenticação", value: "NextAuth v5 — JWT (8h)" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex justify-between items-center py-2.5 border-b border-border/60 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Download className="h-4 w-4 text-muted-foreground" />
            Exportar Dados
          </CardTitle>
          <CardDescription className="text-xs">
            Faz o download de todos os dados armazenados em formato JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Baixar backup JSON
          </Button>
        </CardContent>
      </Card>

    </div>
  );
}
