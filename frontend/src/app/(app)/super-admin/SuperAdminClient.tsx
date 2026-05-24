"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Users, Home, UserSquare, MoreHorizontal, RefreshCw, ShieldAlert,
  TrendingUp, TrendingDown, AlertTriangle, Gift, Ban, BadgeCheck, DollarSign,
  Activity, Minus,
} from "lucide-react";

interface OrgRow {
  id: string;
  nome: string;
  planoAssinatura: string;
  status: string;
  trialExpiresAt: string | null;
  cortesia: boolean;
  cortesiaExpiresAt: string | null;
  cortesiaMotivo: string | null;
  criadoEm: string;
  _count: { moradas: number; formandos: number; usuarios: number };
}

interface Metricas {
  totalOrgs: number;
  orgsAtivas: number;
  orgsTrials: number;
  orgsSuspensas: number;
  orgsCanceladas: number;
  orgsCortesia: number;
  totalFormandos: number;
  totalMoradas: number;
  totalUsuarios: number;
  planoBreakdown: Record<string, number>;
  mrrEstimado: number;
  crescimento30d: number;
  crescimentoAnterior30d: number;
  crescimentoPercent: number;
}

const STATUS_COLORS: Record<string, string> = {
  ATIVO: "bg-emerald-100 text-emerald-700 border-emerald-200",
  TRIAL: "bg-blue-100 text-blue-700 border-blue-200",
  SUSPENSO: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELADO: "bg-red-100 text-red-700 border-red-200",
};

const PLANO_COLORS: Record<string, string> = {
  GRATUITO: "bg-slate-100 text-slate-600",
  ESSENCIAL: "bg-violet-100 text-violet-700",
  PROFISSIONAL: "bg-amber-100 text-amber-700",
};

type DialogAcao = "suspender" | "reativar" | "cancelar" | "plano" | "excluir" | "cortesia" | "revogar-cortesia" | null;

export default function SuperAdminClient() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [dialogAcao, setDialogAcao] = useState<DialogAcao>(null);
  const [novoPlano, setNovoPlano] = useState<string>("");
  const [cortesiaMotivo, setCortesiaMotivo] = useState("");
  const [cortesiaExpiry, setCortesiaExpiry] = useState("");

  const closeDialog = () => { setDialogAcao(null); setSelectedOrg(null); setCortesiaMotivo(""); setCortesiaExpiry(""); };

  const load = useCallback(async () => {
    setLoading(true);
    const [orgsRes, metRes] = await Promise.all([
      fetch("/api/super-admin/organizacoes").then((r) => r.json() as Promise<OrgRow[]>),
      fetch("/api/super-admin/metricas").then((r) => r.json() as Promise<Metricas>),
    ]);
    setOrgs(orgsRes);
    setMetricas(metRes);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function executeAction(orgId: string, acao: string, extra?: Record<string, unknown>) {
    setActionLoading(orgId);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${orgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao executar ação.");
        return;
      }
      const labels: Record<string, string> = {
        suspender: "suspensa", reativar: "reativada", cancelar: "cancelada",
        cortesia: "cortesia concedida", "revogar-cortesia": "cortesia revogada",
      };
      toast.success(`Organização ${labels[acao] ?? "atualizada"} com sucesso.`);
      await load();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setActionLoading(null);
      closeDialog();
    }
  }

  async function deleteOrg() {
    if (!selectedOrg) return;
    setActionLoading(selectedOrg.id);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${selectedOrg.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao excluir organização.");
        return;
      }
      toast.success(`"${selectedOrg.nome}" excluída permanentemente.`);
      await load();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setActionLoading(null);
      closeDialog();
    }
  }

  async function changePlano() {
    if (!selectedOrg || !novoPlano) return;
    setActionLoading(selectedOrg.id);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: novoPlano }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao alterar plano.");
        return;
      }
      toast.success(`Plano alterado para ${novoPlano}.`);
      await load();
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setActionLoading(null);
      closeDialog();
    }
  }

  async function concederCortesia() {
    if (!selectedOrg) return;
    await executeAction(selectedOrg.id, "cortesia", {
      cortesiaMotivo: cortesiaMotivo || undefined,
      cortesiaExpiresAt: cortesiaExpiry || null,
    });
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  const mrrFormatado = metricas
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(metricas.mrrEstimado)
    : "—";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Formatio — Painel Administrativo</h1>
            <p className="text-xs text-muted-foreground">Gestão operacional, tática e estratégica da plataforma</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      {metricas && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />MRR Estimado
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{mrrFormatado}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {metricas.planoBreakdown["ESSENCIAL"] ?? 0} essencial · {metricas.planoBreakdown["PROFISSIONAL"] ?? 0} profissional
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />Organizações
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{metricas.totalOrgs}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {metricas.orgsAtivas} ativas · {metricas.orgsTrials} trial · {metricas.orgsSuspensas} suspensas
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" />Crescimento (30d)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold flex items-center gap-1.5">
                {metricas.crescimento30d}
                <span className={`text-sm font-medium flex items-center gap-0.5 ${metricas.crescimentoPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {metricas.crescimentoPercent > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : metricas.crescimentoPercent < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                  {metricas.crescimentoPercent > 0 ? "+" : ""}{metricas.crescimentoPercent}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                vs {metricas.crescimentoAnterior30d} novas no período anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5" />Cortesias Ativas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-2xl font-bold">{metricas.orgsCortesia}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                organizações isentas de pagamento
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Breakdown row ────────────────────────────────────── */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Status das organizações</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {[
                { label: "Ativas", count: metricas.orgsAtivas, color: "bg-emerald-500" },
                { label: "Trial", count: metricas.orgsTrials, color: "bg-blue-500" },
                { label: "Suspensas", count: metricas.orgsSuspensas, color: "bg-amber-500" },
                { label: "Canceladas", count: metricas.orgsCanceladas, color: "bg-red-500" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "" }} >
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-sm flex-1">{label}</span>
                  <span className="text-sm font-semibold">{count}</span>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {metricas.totalOrgs > 0 ? Math.round((count / metricas.totalOrgs) * 100) : 0}%
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Planos */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Distribuição de planos</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {[
                { label: "Gratuito", key: "GRATUITO", color: "bg-slate-400" },
                { label: "Essencial", key: "ESSENCIAL", color: "bg-violet-500" },
                { label: "Profissional", key: "PROFISSIONAL", color: "bg-amber-500" },
              ].map(({ label, key, color }) => {
                const count = metricas.planoBreakdown[key] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                    <span className="text-sm flex-1">{label}</span>
                    <span className="text-sm font-semibold">{count}</span>
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {metricas.totalOrgs > 0 ? Math.round((count / metricas.totalOrgs) * 100) : 0}%
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Totais globais */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Totais da plataforma</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />Formandos
                </div>
                <span className="font-semibold text-sm">{metricas.totalFormandos.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Home className="h-3.5 w-3.5" />Moradas
                </div>
                <span className="font-semibold text-sm">{metricas.totalMoradas.toLocaleString("pt-BR")}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <UserSquare className="h-3.5 w-3.5" />Usuários
                </div>
                <span className="font-semibold text-sm">{metricas.totalUsuarios.toLocaleString("pt-BR")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tabela de organizações ───────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4 flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Organizações ({orgs.length})</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organização</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Moradas</TableHead>
                <TableHead className="text-center">Formandos</TableHead>
                <TableHead className="text-center">Usuários</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orgs.map((org) => {
                const trialExpired = org.trialExpiresAt && new Date(org.trialExpiresAt) < new Date();
                const cortesiaExpired = org.cortesiaExpiresAt && new Date(org.cortesiaExpiresAt) < new Date();
                return (
                  <TableRow key={org.id} className={org.cortesia ? "bg-violet-50/40 dark:bg-violet-950/10" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span>{org.nome}</span>
                          {org.cortesia && (
                            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium border border-violet-200">
                              <Gift className="h-3 w-3" />
                              {cortesiaExpired ? "Expirada" : "Cortesia"}
                            </span>
                          )}
                        </div>
                        {org.status === "TRIAL" && trialExpired && (
                          <span className="text-xs text-destructive flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" />Trial expirado
                          </span>
                        )}
                        {org.status === "TRIAL" && !trialExpired && org.trialExpiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Trial até {new Date(org.trialExpiresAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {org.cortesia && org.cortesiaMotivo && (
                          <span className="text-xs text-muted-foreground truncate max-w-48">{org.cortesiaMotivo}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLANO_COLORS[org.planoAssinatura] ?? ""}`}>
                        {org.planoAssinatura}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[org.status] ?? ""}`}>
                        {org.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm">{org._count.moradas}</TableCell>
                    <TableCell className="text-center text-sm">{org._count.formandos}</TableCell>
                    <TableCell className="text-center text-sm">{org._count.usuarios}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(org.criadoEm).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                          disabled={actionLoading === org.id}
                        >
                          {actionLoading === org.id
                            ? <RefreshCw className="h-4 w-4 animate-spin" />
                            : <MoreHorizontal className="h-4 w-4" />}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">

                          {/* Plano */}
                          <DropdownMenuItem onClick={() => { setSelectedOrg(org); setNovoPlano(org.planoAssinatura); setDialogAcao("plano"); }}>
                            <TrendingUp className="h-4 w-4 mr-2" />Alterar plano
                          </DropdownMenuItem>

                          {/* Cortesia */}
                          {!org.cortesia ? (
                            <DropdownMenuItem
                              className="text-violet-700"
                              onClick={() => { setSelectedOrg(org); setDialogAcao("cortesia"); }}
                            >
                              <Gift className="h-4 w-4 mr-2" />Conceder cortesia
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-amber-600"
                              onClick={() => { setSelectedOrg(org); setDialogAcao("revogar-cortesia"); }}
                            >
                              <Ban className="h-4 w-4 mr-2" />Revogar cortesia
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {/* Status */}
                          {org.status === "CANCELADO" ? (
                            <DropdownMenuItem
                              className="text-emerald-600"
                              onClick={() => { setSelectedOrg(org); setDialogAcao("reativar"); }}
                            >
                              <BadgeCheck className="h-4 w-4 mr-2" />Reativar
                            </DropdownMenuItem>
                          ) : org.status === "SUSPENSO" ? (
                            <>
                              <DropdownMenuItem
                                className="text-emerald-600"
                                onClick={() => { setSelectedOrg(org); setDialogAcao("reativar"); }}
                              >
                                <BadgeCheck className="h-4 w-4 mr-2" />Reativar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => { setSelectedOrg(org); setDialogAcao("cancelar"); }}
                              >
                                <Ban className="h-4 w-4 mr-2" />Cancelar contrato
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              className="text-amber-600"
                              onClick={() => { setSelectedOrg(org); setDialogAcao("suspender"); }}
                            >
                              <AlertTriangle className="h-4 w-4 mr-2" />Suspender acesso
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => { setSelectedOrg(org); setDialogAcao("excluir"); }}
                          >
                            <Ban className="h-4 w-4 mr-2" />Excluir permanentemente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {orgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    Nenhuma organização cadastrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog — Conceder cortesia ────────────────────────── */}
      <Dialog open={dialogAcao === "cortesia"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-violet-600" />
              Conceder cortesia — {selectedOrg?.nome}
            </DialogTitle>
            <DialogDescription>
              A organização ficará isenta de pagamento enquanto a cortesia estiver ativa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Motivo <span className="text-muted-foreground font-normal">(opcional)</span></label>
              <textarea
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={3}
                placeholder="Ex: Cliente parceiro, período de teste estendido, acordo comercial..."
                value={cortesiaMotivo}
                onChange={(e) => setCortesiaMotivo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Validade <span className="text-muted-foreground font-normal">(vazio = indefinido)</span></label>
              <input
                type="date"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={cortesiaExpiry}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setCortesiaExpiry(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={actionLoading === selectedOrg?.id}
              onClick={concederCortesia}
            >
              <Gift className="h-4 w-4 mr-1.5" />Conceder Cortesia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Revogar cortesia ─────────────────────────── */}
      <Dialog open={dialogAcao === "revogar-cortesia"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar cortesia</DialogTitle>
            <DialogDescription>
              A organização <strong>{selectedOrg?.nome}</strong> voltará ao regime de cobrança normal conforme o plano <strong>{selectedOrg?.planoAssinatura}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={actionLoading === selectedOrg?.id}
              onClick={() => selectedOrg && executeAction(selectedOrg.id, "revogar-cortesia")}
            >
              Revogar cortesia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Suspender/Reativar ───────────────────────── */}
      <Dialog open={dialogAcao === "suspender" || dialogAcao === "reativar"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAcao === "suspender" ? "Suspender acesso" : "Reativar organização"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {dialogAcao === "suspender"
              ? `Tem certeza que deseja suspender "${selectedOrg?.nome}"? Os usuários perderão acesso imediatamente.`
              : `Deseja reativar "${selectedOrg?.nome}"?`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              variant={dialogAcao === "suspender" ? "destructive" : "default"}
              onClick={() => selectedOrg && executeAction(selectedOrg.id, dialogAcao === "suspender" ? "suspender" : "reativar")}
            >
              {dialogAcao === "suspender" ? "Suspender" : "Reativar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Cancelar contrato ────────────────────────── */}
      <Dialog open={dialogAcao === "cancelar"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar contrato</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja cancelar o contrato de{" "}
            <strong>&ldquo;{selectedOrg?.nome}&rdquo;</strong>? O status será alterado para{" "}
            <strong>CANCELADO</strong> e os usuários não terão mais acesso.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Voltar</Button>
            <Button
              variant="destructive"
              disabled={actionLoading === selectedOrg?.id}
              onClick={() => selectedOrg && executeAction(selectedOrg.id, "cancelar")}
            >
              Cancelar contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Excluir permanentemente ─────────────────── */}
      <Dialog open={dialogAcao === "excluir"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir organização permanentemente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta ação é <strong>irreversível</strong>. Todos os dados de{" "}
            <strong>&ldquo;{selectedOrg?.nome}&rdquo;</strong> — usuários, formandos, formações,
            documentos e histórico — serão apagados definitivamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button variant="destructive" disabled={actionLoading === selectedOrg?.id} onClick={deleteOrg}>
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog — Alterar plano ────────────────────────────── */}
      <Dialog open={dialogAcao === "plano"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar plano — {selectedOrg?.nome}</DialogTitle>
            <DialogDescription>
              Plano atual: <strong>{selectedOrg?.planoAssinatura}</strong>
            </DialogDescription>
          </DialogHeader>
          <Select value={novoPlano} onValueChange={(v) => v && setNovoPlano(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GRATUITO">Gratuito — 1 morada, 30 formandos</SelectItem>
              <SelectItem value="ESSENCIAL">Essencial — 3 moradas, 150 formandos (R$ 149/mês)</SelectItem>
              <SelectItem value="PROFISSIONAL">Profissional — ilimitado (R$ 349/mês)</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={changePlano} disabled={!novoPlano || novoPlano === selectedOrg?.planoAssinatura || actionLoading === selectedOrg?.id}>
              Salvar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
