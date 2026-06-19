"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Building2, Users, CalendarPlus, KeyRound, AlertTriangle,
  BadgeCheck, Ban, Gift, TrendingUp, Clock, CheckCircle2, RefreshCw,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrgFull {
  id: string;
  nome: string;
  planoAssinatura: string;
  status: string;
  tipoOrganizacao: string;
  trialExpiresAt: Date | null;
  cortesia: boolean;
  cortesiaExpiresAt: Date | null;
  cortesiaMotivo: string | null;
  onboardingConcluido: boolean;
  criadoEm: Date;
}

interface AuditEntry {
  id: string;
  acao: string;
  ip: string | null;
  criadoEm: Date;
  detalhes: unknown;
  usuario: { nome: string; email: string } | null;
}

interface UsuarioEntry {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  criadoEm: Date;
}

interface Stats { formandos: number; grupos: number; usuarios: number }

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  TRIAL: "bg-blue-100 text-blue-700 border-blue-200",
  SUSPENSO: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELADO: "bg-red-100 text-red-700 border-red-200",
};

const PLANO_COLORS: Record<string, string> = {
  GRATUITO: "bg-slate-100 text-slate-600",
  BASICO: "bg-sky-100 text-sky-700",
  INTERMEDIARIO: "bg-violet-100 text-violet-700",
  AVANCADO: "bg-amber-100 text-amber-700",
  PERSONALIZADO: "bg-emerald-100 text-emerald-700",
};

const PERFIL_LABELS: Record<string, string> = {
  administrador: "Administrador",
  formador_geral: "Formador Geral",
  formador_comunitario: "Formador Comunitário",
  super_admin: "Super Admin",
};

const TIPO_LABELS: Record<string, string> = {
  nova_comunidade: "Nova Comunidade",
  grupo_oracao: "Grupo de Oração",
  instituto_religioso: "Instituto Religioso",
  centro_formativo: "Centro Formativo",
};

const ACAO_CLASS: Record<string, string> = {
  organizacao_deleted: "bg-red-50 text-red-700 border-red-200",
  organizacao_cancelada: "bg-red-50 text-red-600 border-red-100",
  organizacao_suspended: "bg-amber-50 text-amber-700 border-amber-200",
  organizacao_cortesia_concedida: "bg-violet-50 text-violet-700 border-violet-200",
  organizacao_trial_extended: "bg-blue-50 text-blue-700 border-blue-200",
  organizacao_reactivated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  organizacao_plan_changed: "bg-blue-50 text-blue-700 border-blue-200",
  admin_credentials_reset: "bg-amber-50 text-amber-700 border-amber-200",
  login_success: "bg-slate-50 text-slate-600 border-slate-200",
  login_failure: "bg-red-50 text-red-600 border-red-100",
};

const PAGE_SIZE = 10;

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OrgDetailClient({
  org,
  logs,
  admins,
  stats,
}: {
  org: OrgFull;
  logs: AuditEntry[];
  admins: UsuarioEntry[];
  stats: Stats;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"usuarios" | "logs">("usuarios");
  const [pageUsers, setPageUsers] = useState(1);
  const [pageLogs, setPageLogs] = useState(1);
  const [loading, setLoading] = useState<string | null>(null);
  const [dialogAcao, setDialogAcao] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState("30");

  const trialExpired = org.trialExpiresAt && new Date(org.trialExpiresAt) < new Date();

  async function execAction(acao: string, extra?: Record<string, unknown>) {
    setLoading(acao);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${org.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, ...extra }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Falha ao executar ação.");
        return;
      }
      const labels: Record<string, string> = {
        suspender: "Organização suspensa.",
        reativar: "Organização reativada.",
        cancelar: "Contrato cancelado.",
        "estender-trial": "Trial estendido com sucesso.",
      };
      toast.success(labels[acao] ?? "Ação executada.");
      router.refresh();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setLoading(null);
      setDialogAcao(null);
    }
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/super-admin"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-1 text-muted-foreground")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />Super Admin
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {org.nome}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {TIPO_LABELS[org.tipoOrganizacao] ?? org.tipoOrganizacao}
            {" · "}ID: <span className="font-mono">{org.id}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PLANO_COLORS[org.planoAssinatura] ?? "")}>
            {org.planoAssinatura}
          </span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium border", STATUS_COLORS[org.status] ?? "")}>
            {org.status}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Formandos", value: stats.formandos },
          { label: "Grupos de Formação", value: stats.grupos },
          { label: "Usuários ativos", value: stats.usuarios },
          {
            label: org.status === "TRIAL" ? "Trial expira em" : "Cadastro",
            value: org.status === "TRIAL" && org.trialExpiresAt
              ? new Date(org.trialExpiresAt).toLocaleDateString("pt-BR")
              : new Date(org.criadoEm).toLocaleDateString("pt-BR"),
          },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="px-4 pt-3 pb-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold mt-0.5">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info grid */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium">Informações</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-medium">{org.status}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="font-medium">{org.planoAssinatura}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo de organização</p>
              <p className="font-medium">{TIPO_LABELS[org.tipoOrganizacao] ?? org.tipoOrganizacao}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Onboarding</p>
              <p className="font-medium flex items-center gap-1">
                {org.onboardingConcluido
                  ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />Concluído</>
                  : <><Clock className="h-3.5 w-3.5 text-amber-500" />Pendente</>}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cadastro</p>
              <p className="font-medium">{new Date(org.criadoEm).toLocaleDateString("pt-BR")}</p>
            </div>
            {org.status === "TRIAL" && (
              <div>
                <p className="text-xs text-muted-foreground">Trial</p>
                <p className={cn("font-medium flex items-center gap-1", trialExpired ? "text-destructive" : "")}>
                  {trialExpired && <AlertTriangle className="h-3.5 w-3.5" />}
                  {org.trialExpiresAt
                    ? `Expira ${new Date(org.trialExpiresAt).toLocaleDateString("pt-BR")}`
                    : "Sem data definida"}
                </p>
              </div>
            )}
            {org.cortesia && (
              <div>
                <p className="text-xs text-muted-foreground">Cortesia</p>
                <p className="font-medium text-violet-700 flex items-center gap-1">
                  <Gift className="h-3.5 w-3.5" />
                  {org.cortesiaExpiresAt
                    ? `Até ${new Date(org.cortesiaExpiresAt).toLocaleDateString("pt-BR")}`
                    : "Indefinida"}
                </p>
                {org.cortesiaMotivo && (
                  <p className="text-xs text-muted-foreground mt-0.5">{org.cortesiaMotivo}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {org.status === "TRIAL" && (
          <Button size="sm" variant="outline" onClick={() => setDialogAcao("estender-trial")}>
            <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />Estender trial
          </Button>
        )}
        {org.status === "ATIVO" || org.status === "TRIAL" ? (
          <Button size="sm" variant="outline" className="text-amber-600 border-amber-200"
            onClick={() => setDialogAcao("suspender")}
            disabled={!!loading}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />Suspender
          </Button>
        ) : org.status === "SUSPENSO" ? (
          <>
            <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200"
              onClick={() => execAction("reativar")}
              disabled={!!loading}
            >
              {loading === "reativar" ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <BadgeCheck className="h-3.5 w-3.5 mr-1.5" />}
              Reativar
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 border-red-200"
              onClick={() => setDialogAcao("cancelar")}
              disabled={!!loading}
            >
              <Ban className="h-3.5 w-3.5 mr-1.5" />Cancelar contrato
            </Button>
          </>
        ) : org.status === "CANCELADO" ? (
          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200"
            onClick={() => execAction("reativar")}
            disabled={!!loading}
          >
            <BadgeCheck className="h-3.5 w-3.5 mr-1.5" />Reativar
          </Button>
        ) : null}

        <Link
          href={`/super-admin/organizacoes/${org.id}/reset-credenciais`}
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          <KeyRound className="h-3.5 w-3.5 mr-1.5" />Reset de acesso
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b">
        {(["usuarios", "logs"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "usuarios" ? <Users className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {t === "usuarios" ? `Usuários (${admins.length})` : `Audit Log (${logs.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Usuários */}
      {tab === "usuarios" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum usuário ativo.
                    </TableCell>
                  </TableRow>
                ) : admins.slice((pageUsers - 1) * PAGE_SIZE, pageUsers * PAGE_SIZE).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-sm">{u.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">
                        {PERFIL_LABELS[u.perfil] ?? u.perfil}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.criadoEm).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {admins.length > PAGE_SIZE && (
              <div className="px-4 py-3 border-t">
                <Pagination total={admins.length} page={pageUsers} pageSize={PAGE_SIZE} onPageChange={setPageUsers} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Audit Log */}
      {tab === "logs" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Data/Hora</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Nenhum evento registrado.
                    </TableCell>
                  </TableRow>
                ) : logs.slice((pageLogs - 1) * PAGE_SIZE, pageLogs * PAGE_SIZE).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full border font-medium font-mono",
                        ACAO_CLASS[log.acao] ?? "bg-muted text-muted-foreground border-border"
                      )}>
                        {log.acao}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.usuario?.nome ?? log.usuario?.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.ip ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(log.criadoEm)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {logs.length > PAGE_SIZE && (
              <div className="px-4 py-3 border-t">
                <Pagination total={logs.length} page={pageLogs} pageSize={PAGE_SIZE} onPageChange={setPageLogs} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={dialogAcao === "estender-trial"} onOpenChange={() => setDialogAcao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-blue-600" />
              Estender trial
            </DialogTitle>
            <DialogDescription>
              {org.trialExpiresAt
                ? `Trial atual expira em ${new Date(org.trialExpiresAt).toLocaleDateString("pt-BR")}.`
                : "Sem data de expiração definida."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-1">
            <label className="text-sm font-medium">Dias a adicionar</label>
            <input
              type="number"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAcao(null)}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!trialDays || parseInt(trialDays) < 1 || loading === "estender-trial"}
              onClick={() => execAction("estender-trial", { trialDays: parseInt(trialDays) })}
            >
              {loading === "estender-trial"
                ? <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />
                : <CalendarPlus className="h-4 w-4 mr-1.5" />}
              Estender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogAcao === "suspender"} onOpenChange={() => setDialogAcao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspender acesso</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja suspender <strong>{org.nome}</strong>? Os usuários perderão acesso imediatamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAcao(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={loading === "suspender"} onClick={() => execAction("suspender")}>
              {loading === "suspender" && <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />}
              Suspender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogAcao === "cancelar"} onOpenChange={() => setDialogAcao(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar contrato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja cancelar o contrato de <strong>{org.nome}</strong>? O status será alterado para CANCELADO.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAcao(null)}>Voltar</Button>
            <Button variant="destructive" disabled={loading === "cancelar"} onClick={() => execAction("cancelar")}>
              {loading === "cancelar" && <RefreshCw className="h-4 w-4 animate-spin mr-1.5" />}
              Cancelar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
