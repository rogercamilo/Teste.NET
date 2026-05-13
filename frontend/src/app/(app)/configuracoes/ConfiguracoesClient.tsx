"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useComunidade, db } from "@/lib/data-store";
import type { UserPublic } from "@/lib/users-store";
import {
  PERFIL_USUARIO_LABELS,
  NIVEL_FORMATIVO_LABELS,
  type PerfilUsuario,
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
  Building2,
  Calendar,
  CheckCircle2,
  Clipboard,
  Database,
  Download,
  Eye,
  EyeOff,
  Home,
  ImageIcon,
  Info,
  KeyRound,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Server,
  ShieldCheck,
  Shuffle,
  Trash2,
  Upload,
  User,
  UserCog,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { THEME_PALETTES, applyThemePalette, getStoredThemeKey, saveThemeKey } from "@/lib/themes";

interface ConfiguracoesClientProps {
  userId: string;
  userName: string;
  userEmail: string;
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
}: ConfiguracoesClientProps) {
  return (
    <div className="space-y-5 animate-in-fast">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie usuários, dados da comunidade e preferências do sistema
        </p>
      </div>

      <Tabs defaultValue="perfil">
        <TabsList className="bg-muted/50 h-9">
          <TabsTrigger value="perfil" className="text-xs h-7 gap-1.5">
            <User className="h-3.5 w-3.5" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="text-xs h-7 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="comunidade" className="text-xs h-7 gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Comunidade
          </TabsTrigger>
          <TabsTrigger value="sistema" className="text-xs h-7 gap-1.5">
            <Server className="h-3.5 w-3.5" />
            Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-4">
          <PerfilTab userId={userId} userName={userName} userEmail={userEmail} />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <UsuariosTab currentUserId={userId} />
        </TabsContent>

        <TabsContent value="comunidade" className="mt-4">
          <ComunidadeTab />
        </TabsContent>

        <TabsContent value="sistema" className="mt-4">
          <SistemaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── TAB: PERFIL ───────────────────────────────────────────────── */

function PerfilTab({
  userId,
  userName,
  userEmail,
}: {
  userId: string;
  userName: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UserPublic | null>(null);

  // Troca de senha
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((users: UserPublic[]) => setUsuario(users.find((u) => u.id === userId) ?? null))
      .catch(() => {});
  }, [userId]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter ao menos 6 caracteres."); return;
    }
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
      router.refresh();
    } finally {
      setSavingPassword(false);
    }
  }

  const perfilLabel =
    usuario?.perfil === "administrador" ? "Administrador" : "Formador Comunitário";

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
    </div>
  );
}

/* ─── TAB: USUÁRIOS ─────────────────────────────────────────────── */

type UsuarioForm = {
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  moradaId: string;
  ativo: boolean;
  password: string;
  confirmPassword: string;
  gerarSenhaAuto: boolean;
};

const EMPTY_USUARIO_FORM: UsuarioForm = {
  nome: "",
  email: "",
  perfil: "formador_comunitario",
  moradaId: "",
  ativo: true,
  password: "",
  confirmPassword: "",
  gerarSenhaAuto: true,
};

function UsuariosTab({ currentUserId }: { currentUserId: string }) {
  const [usuarios, setUsuarios] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [allMoradas] = useState(() => db.moradas.load());
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tempPasswordDialog, setTempPasswordDialog] = useState<{
    nome: string;
    email: string;
    password: string;
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

  function openEdit(u: UserPublic) {
    setEditing(u);
    setForm({
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      moradaId: u.moradaId ?? "",
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
    if (form.perfil === "formador_comunitario" && !form.moradaId) {
      toast.error("Formadores comunitários precisam estar vinculados a uma morada."); return;
    }

    setSaving(true);
    try {
      if (editing) {
        const body: Record<string, unknown> = {
          nome: form.nome.trim(),
          email: form.email.trim(),
          perfil: form.perfil,
          moradaId: form.perfil === "formador_comunitario" ? form.moradaId || undefined : undefined,
          ativo: form.ativo,
        };
        if (form.password) body.password = form.password;
        const res = await fetch(`/api/users/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json() as { error?: string };
          toast.error(err.error ?? "Falha ao atualizar usuário."); return;
        }
        const updated: UserPublic = await res.json();
        setUsuarios((prev) => prev.map((u) => (u.id === editing.id ? updated : u)));
        toast.success("Usuário atualizado com sucesso!");
        setDialogOpen(false);
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: form.nome.trim(),
            email: form.email.trim(),
            password: form.gerarSenhaAuto ? undefined : form.password,
            perfil: form.perfil,
            moradaId: form.perfil === "formador_comunitario" ? form.moradaId || undefined : undefined,
            ativo: form.ativo,
          }),
        });
        if (!res.ok) {
          const err = await res.json() as { error?: string };
          toast.error(err.error ?? "Falha ao criar usuário."); return;
        }
        const created = await res.json() as UserPublic & { tempPassword?: string };
        setUsuarios((prev) => [...prev, created]);
        setDialogOpen(false);
        if (created.tempPassword) {
          setTempPasswordDialog({
            nome: created.nome,
            email: created.email,
            password: created.tempPassword,
          });
        } else {
          toast.success("Usuário criado com sucesso!");
        }
      }
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

  const moradaDoFormulario = allMoradas.find((m) => m.id === form.moradaId);

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
        <Button size="sm" onClick={openCreate} className="sm:ml-auto gap-1.5">
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs font-semibold text-muted-foreground">Usuário</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground hidden sm:table-cell">Perfil</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground hidden md:table-cell">Morada</TableHead>
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
              const morada = allMoradas.find((m) => m.id === usuario.moradaId);
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
                    {morada ? (
                      <span className="flex items-center gap-1">
                        <Home className="h-3 w-3 shrink-0" />
                        {morada.nome}
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
        <DialogContent className="sm:max-w-md">
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
              <Select value={form.perfil} onValueChange={(v) => v && set("perfil")(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">
                    {PERFIL_USUARIO_LABELS["administrador"]}
                  </SelectItem>
                  <SelectItem value="formador_comunitario">
                    {PERFIL_USUARIO_LABELS["formador_comunitario"]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.perfil === "formador_comunitario" && (
              <div className="grid gap-1.5">
                <Label>
                  Morada vinculada <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.moradaId}
                  onValueChange={(v) => v && set("moradaId")(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a morada..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMoradas
                      .filter((m) => m.ativo)
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome} — {NIVEL_FORMATIVO_LABELS[m.nivelFormativo]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {moradaDoFormulario && (
                  <p className="text-xs text-muted-foreground">
                    Nível: {NIVEL_FORMATIVO_LABELS[moradaDoFormulario.nivelFormativo]}
                  </p>
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
              O usuário{" "}
              <span className="font-medium text-foreground">{tempPasswordDialog?.nome}</span>{" "}
              foi criado. Compartilhe a senha temporária abaixo para que ele possa fazer o
              primeiro acesso.
            </p>
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-1">E-mail de acesso</p>
              <p className="text-sm font-medium text-foreground">{tempPasswordDialog?.email}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs text-primary/70 mb-1">Senha temporária de primeiro acesso</p>
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
                Esta senha só é exibida uma vez. O usuário deverá alterá-la no primeiro login.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setTempPasswordDialog(null)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── TAB: COMUNIDADE ───────────────────────────────────────────── */

const MAX_LOGO_BYTES = 1_048_576; // 1 MB

function ComunidadeTab() {
  const [comunidade, setComunidade] = useComunidade();
  const [form, setForm] = useState<ComunidadeConfig>(() => ({ ...comunidade }));
  const [dirty, setDirty] = useState(false);

  // Logo state
  const [logo, setLogo] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("appForm:logo") : null
  );
  const [dragOver, setDragOver] = useState(false);

  // Theme state
  const [themeKey, setThemeKey] = useState<string>(() => getStoredThemeKey());

  function handleChange(field: keyof ComunidadeConfig, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }

  function handleSave() {
    if (!form.nome.trim()) return toast.error("Nome da comunidade é obrigatório.");
    setComunidade(form);
    setDirty(false);
    toast.success("Configurações da comunidade salvas!");
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
      localStorage.setItem("appForm:logo", base64);
      window.dispatchEvent(new Event("appform:logo-changed"));
      setLogo(base64);
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
    localStorage.removeItem("appForm:logo");
    window.dispatchEvent(new Event("appform:logo-changed"));
    setLogo(null);
    toast.success("Logo removida.");
  }

  function handleThemeSelect(key: string) {
    setThemeKey(key);
    saveThemeKey(key);
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

/* ─── TAB: SISTEMA ──────────────────────────────────────────────── */

function SistemaTab() {
  const [resetOpen, setResetOpen] = useState(false);
  const [counts] = useState(() => ({
    formandos: db.formandos.load().length,
    moradas: db.moradas.load().length,
    planos: db.planos.load().length,
    grades: db.grades.load().length,
    usuarios: db.usuarios.load().length,
    comentarios: db.comentarios.load().length,
    presencas: db.presencas.load().length,
  }));

  function handleExport() {
    const data = {
      exportadoEm: new Date().toISOString(),
      versao: "3",
      formandos: db.formandos.load(),
      moradas: db.moradas.load(),
      planos: db.planos.load(),
      grades: db.grades.load(),
      usuarios: db.usuarios.load(),
      comentarios: db.comentarios.load(),
      presencas: db.presencas.load(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `app-formativo-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dados exportados com sucesso!");
  }

  function handleReset() {
    const prefix = "appForm:";
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => localStorage.removeItem(k));
    toast.success("Dados reiniciados. Recarregando...");
    setTimeout(() => window.location.reload(), 800);
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
            { label: "Aplicativo", value: "App Formativo — Dom Bosco" },
            { label: "Versão do schema", value: "3" },
            { label: "Ambiente", value: "Desenvolvimento / Mock" },
            { label: "Armazenamento", value: "localStorage (navegador)" },
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

      {/* Data counts */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Dados Armazenados
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Formandos", count: counts.formandos },
              { label: "Moradas", count: counts.moradas },
              { label: "Usuários", count: counts.usuarios },
              { label: "Planos", count: counts.planos },
              { label: "Grades", count: counts.grades },
              { label: "Comentários", count: counts.comentarios },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
              >
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-sm font-bold text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
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

      {/* Danger zone */}
      <Card className="border-0 shadow-sm border border-destructive/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Zona de Perigo
          </CardTitle>
          <CardDescription className="text-xs">
            Ações irreversíveis que afetam todos os dados do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Reiniciar todos os dados</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Remove todos os dados salvos e restaura os dados de exemplo
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setResetOpen(true)}
              className="gap-1.5 shrink-0 ml-4"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reiniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset confirmation dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reiniciar todos os dados
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta ação irá remover permanentemente todos os dados salvos localmente e
              restaurar os dados de exemplo originais.
            </p>
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5">
              <p className="text-xs font-medium text-destructive">
                Todos os formandos, moradas, planos, comentários e configurações criados
                serão perdidos.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Sim, reiniciar tudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
