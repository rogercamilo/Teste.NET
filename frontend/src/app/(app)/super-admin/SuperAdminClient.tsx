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
  Building2, Users, ShieldAlert, RefreshCw, MoreHorizontal,
  TrendingUp, TrendingDown, AlertTriangle, Gift, Ban, BadgeCheck,
  DollarSign, Activity, Minus, Scale, FileText, CheckCircle2, Clock,
  Shield, KeyRound, Copy, type LucideIcon,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface LgpdData {
  deletionRequests: {
    id: string; tipo: string; status: string;
    usuarioId: string | null; organizacaoId: string | null;
    solicitadoEm: string; processadoEm: string | null;
  }[];
  deletionStats: { pendentes: number; processando: number; concluidos: number };
  privacyByTipo: { tipo: string; versao: string; _count: { id: number } }[];
  cookieTotal: number;
  cookieAnaliticos: number;
}

interface ResetResult {
  usuarios: { nome: string; email: string }[];
  senhaTemporaria: string;
}

type DialogAcao = "suspender" | "reativar" | "cancelar" | "plano" | "excluir" | "cortesia" | "revogar-cortesia" | "reset-credenciais" | null;
type Tab = "organizacoes" | "financeiro" | "cortesias" | "lgpd";

// ── Constants ─────────────────────────────────────────────────────────────────

const MRR_PRICE: Record<string, number> = { GRATUITO: 0, ESSENCIAL: 149, PROFISSIONAL: 349 };

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

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: "organizacoes", label: "Organizações", Icon: Building2 },
  { id: "financeiro", label: "Financeiro", Icon: DollarSign },
  { id: "cortesias", label: "Cortesias", Icon: Gift },
  { id: "lgpd", label: "LGPD", Icon: Shield },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function SuperAdminClient() {
  const PAGE_SIZE = 10;
  const [tab, setTab] = useState<Tab>("organizacoes");
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [lgpd, setLgpd] = useState<LgpdData | null>(null);
  const [lgpdLoaded, setLgpdLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lgpdActionLoading, setLgpdActionLoading] = useState<string | null>(null);
  const [pageOrgs, setPageOrgs] = useState(1);
  const [pageCortesias, setPageCortesias] = useState(1);
  const [pageLgpd, setPageLgpd] = useState(1);

  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [dialogAcao, setDialogAcao] = useState<DialogAcao>(null);
  const [novoPlano, setNovoPlano] = useState<string>("");
  const [cortesiaMotivo, setCortesiaMotivo] = useState("");
  const [cortesiaExpiry, setCortesiaExpiry] = useState("");
  const [resetJustificativa, setResetJustificativa] = useState("");
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);

  const closeDialog = () => {
    setDialogAcao(null);
    setSelectedOrg(null);
    setCortesiaMotivo("");
    setCortesiaExpiry("");
    setResetJustificativa("");
    setResetResult(null);
  };

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

  const loadLgpd = useCallback(async () => {
    const res = await fetch("/api/super-admin/lgpd").then((r) => r.json() as Promise<LgpdData>);
    setLgpd(res);
    setLgpdLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPageOrgs(1); setPageCortesias(1); }, [orgs]);
  useEffect(() => { setPageLgpd(1); }, [lgpd]);

  useEffect(() => {
    if (tab === "lgpd" && !lgpdLoaded) loadLgpd();
  }, [tab, lgpdLoaded, loadLgpd]);

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

  async function resetCredenciais() {
    if (!selectedOrg || resetJustificativa.trim().length < 10) return;
    setActionLoading(selectedOrg.id);
    try {
      const res = await fetch(`/api/super-admin/organizacoes/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao: "reset-credenciais", justificativa: resetJustificativa.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Falha ao resetar credenciais.");
        return;
      }
      const data = await res.json() as ResetResult;
      setResetResult(data);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setActionLoading(null);
    }
  }

  async function updateDeletion(id: string, status: string) {
    setLgpdActionLoading(id);
    try {
      const res = await fetch("/api/super-admin/lgpd", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        toast.error("Falha ao atualizar solicitação.");
        return;
      }
      toast.success("Solicitação atualizada.");
      await loadLgpd();
    } catch {
      toast.error("Erro de rede.");
    } finally {
      setLgpdActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="flex gap-0 border-b">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-32 bg-muted rounded-t mr-1" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="h-96 bg-muted rounded-xl" />
      </div>
    );
  }

  const mrrFmt = metricas
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(metricas.mrrEstimado)
    : "—";

  const cortesiasOrgs = orgs.filter((o) => o.cortesia);

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Super Admin — Formatio</h1>
          <p className="text-xs text-muted-foreground">Gestão do negócio, contratos e compliance</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />Atualizar
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-0 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "lgpd" && lgpd && lgpd.deletionStats.pendentes > 0 && (
              <span className="ml-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {lgpd.deletionStats.pendentes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Organizações ────────────────────────────────────────────────── */}
      {tab === "organizacoes" && (
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
                {orgs.slice((pageOrgs - 1) * PAGE_SIZE, pageOrgs * PAGE_SIZE).map((org) => {
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
                            <DropdownMenuItem onClick={() => { setSelectedOrg(org); setNovoPlano(org.planoAssinatura); setDialogAcao("plano"); }}>
                              <TrendingUp className="h-4 w-4 mr-2" />Alterar plano
                            </DropdownMenuItem>

                            {!org.cortesia ? (
                              <DropdownMenuItem className="text-violet-700" onClick={() => { setSelectedOrg(org); setDialogAcao("cortesia"); }}>
                                <Gift className="h-4 w-4 mr-2" />Conceder cortesia
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="text-amber-600" onClick={() => { setSelectedOrg(org); setDialogAcao("revogar-cortesia"); }}>
                                <Ban className="h-4 w-4 mr-2" />Revogar cortesia
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {org.status === "CANCELADO" ? (
                              <DropdownMenuItem className="text-emerald-600" onClick={() => { setSelectedOrg(org); setDialogAcao("reativar"); }}>
                                <BadgeCheck className="h-4 w-4 mr-2" />Reativar
                              </DropdownMenuItem>
                            ) : org.status === "SUSPENSO" ? (
                              <>
                                <DropdownMenuItem className="text-emerald-600" onClick={() => { setSelectedOrg(org); setDialogAcao("reativar"); }}>
                                  <BadgeCheck className="h-4 w-4 mr-2" />Reativar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrg(org); setDialogAcao("cancelar"); }}>
                                  <Ban className="h-4 w-4 mr-2" />Cancelar contrato
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem className="text-amber-600" onClick={() => { setSelectedOrg(org); setDialogAcao("suspender"); }}>
                                <AlertTriangle className="h-4 w-4 mr-2" />Suspender acesso
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem onClick={() => { setSelectedOrg(org); setDialogAcao("reset-credenciais"); }}>
                              <KeyRound className="h-4 w-4 mr-2" />Resetar acesso de admin
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedOrg(org); setDialogAcao("excluir"); }}>
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
            {orgs.length > 0 && (
              <div className="px-4 py-3 border-t">
                <Pagination total={orgs.length} page={pageOrgs} pageSize={PAGE_SIZE} onPageChange={setPageOrgs} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Financeiro ──────────────────────────────────────────────────── */}
      {tab === "financeiro" && metricas && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />MRR Estimado
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold">{mrrFmt}</div>
                <div className="text-xs text-muted-foreground mt-1">receita mensal recorrente estimada</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" />Crescimento (30d)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold flex items-center gap-2">
                  {metricas.crescimento30d}
                  <span className={`text-base font-medium flex items-center gap-0.5 ${metricas.crescimentoPercent >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {metricas.crescimentoPercent > 0
                      ? <TrendingUp className="h-4 w-4" />
                      : metricas.crescimentoPercent < 0
                        ? <TrendingDown className="h-4 w-4" />
                        : <Minus className="h-4 w-4 text-muted-foreground" />}
                    {metricas.crescimentoPercent > 0 ? "+" : ""}{metricas.crescimentoPercent}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  novas orgs · vs {metricas.crescimentoAnterior30d} no período anterior
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />Orgs Pagantes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold">
                  {(metricas.planoBreakdown["ESSENCIAL"] ?? 0) + (metricas.planoBreakdown["PROFISSIONAL"] ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  de {metricas.totalOrgs} organizações totais
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Receita por Plano</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead className="text-right">Organizações</TableHead>
                    <TableHead className="text-right">Preço / mês</TableHead>
                    <TableHead className="text-right">Receita Estimada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { label: "Gratuito", key: "GRATUITO", color: "bg-slate-100 text-slate-600" },
                    { label: "Essencial", key: "ESSENCIAL", color: "bg-violet-100 text-violet-700" },
                    { label: "Profissional", key: "PROFISSIONAL", color: "bg-amber-100 text-amber-700" },
                  ].map(({ label, key, color }) => {
                    const count = metricas.planoBreakdown[key] ?? 0;
                    const price = MRR_PRICE[key] ?? 0;
                    const total = count * price;
                    const totalFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(total);
                    const priceFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(price);
                    return (
                      <TableRow key={key}>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{count}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{priceFmt}</TableCell>
                        <TableCell className="text-right font-bold">{totalFmt}</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{metricas.totalOrgs}</TableCell>
                    <TableCell />
                    <TableCell className="text-right">{mrrFmt}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Resumo de Status</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {[
                  { label: "Ativas", count: metricas.orgsAtivas, color: "bg-emerald-500" },
                  { label: "Em Trial", count: metricas.orgsTrials, color: "bg-blue-500" },
                  { label: "Suspensas", count: metricas.orgsSuspensas, color: "bg-amber-500" },
                  { label: "Canceladas", count: metricas.orgsCanceladas, color: "bg-red-500" },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-2">
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
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Usuários da plataforma</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {[
                  { icon: Users, label: "Formandos", value: metricas.totalFormandos },
                  { icon: Building2, label: "Moradas", value: metricas.totalMoradas },
                  { icon: Users, label: "Usuários", value: metricas.totalUsuarios },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />{label}
                    </div>
                    <span className="font-semibold text-sm tabular-nums">{value.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Isenções</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold text-violet-700">{metricas.orgsCortesia}</div>
                <div className="text-xs text-muted-foreground mt-1 mb-4">orgs com cortesia ativa</div>
                <div className="text-xs text-muted-foreground">
                  Receita não realizada estimada:{" "}
                  <span className="font-semibold text-foreground">
                    — (consulte aba Cortesias)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Cortesias ────────────────────────────────────────────────────── */}
      {tab === "cortesias" && (
        <div className="space-y-4">
          {cortesiasOrgs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma organização com cortesia ativa.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Gift className="h-4 w-4 text-violet-600" />
                  Organizações com Cortesia ({cortesiasOrgs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organização</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cortesiasOrgs.slice((pageCortesias - 1) * PAGE_SIZE, pageCortesias * PAGE_SIZE).map((org) => {
                      const expired = org.cortesiaExpiresAt && new Date(org.cortesiaExpiresAt) < new Date();
                      return (
                        <TableRow key={org.id} className="bg-violet-50/40">
                          <TableCell className="font-medium">{org.nome}</TableCell>
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
                          <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                            {org.cortesiaMotivo ?? "—"}
                          </TableCell>
                          <TableCell>
                            {org.cortesiaExpiresAt ? (
                              <span className={`text-xs font-medium ${expired ? "text-red-600" : "text-emerald-600"}`}>
                                {expired ? "Expirada" : ""}
                                {new Date(org.cortesiaExpiresAt).toLocaleDateString("pt-BR")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Indefinida</span>
                            )}
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
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-amber-600"
                                  onClick={() => { setSelectedOrg(org); setDialogAcao("revogar-cortesia"); }}
                                >
                                  <Ban className="h-4 w-4 mr-2" />Revogar cortesia
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedOrg(org); setDialogAcao("cortesia"); }}>
                                  <Gift className="h-4 w-4 mr-2" />Editar cortesia
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {cortesiasOrgs.length > 0 && (
                  <div className="px-4 py-3 border-t">
                    <Pagination total={cortesiasOrgs.length} page={pageCortesias} pageSize={PAGE_SIZE} onPageChange={setPageCortesias} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Tab: LGPD ─────────────────────────────────────────────────────────── */}
      {tab === "lgpd" && (
        <div className="space-y-6">
          {!lgpd ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
              </div>
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />Exclusões Pendentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className={`text-2xl font-bold ${lgpd.deletionStats.pendentes > 0 ? "text-amber-600" : ""}`}>
                      {lgpd.deletionStats.pendentes}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">aguardando processamento</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5" />Aceites de Privacidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-2xl font-bold">
                      {lgpd.privacyByTipo.reduce((s, p) => s + p._count.id, 0).toLocaleString("pt-BR")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">registros de consentimento</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />Consentimentos de Cookies
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="text-2xl font-bold">{lgpd.cookieTotal.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {lgpd.cookieAnaliticos} aceitaram analytics
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">Solicitações de Exclusão (Art. 18 LGPD)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Solicitado em</TableHead>
                        <TableHead>Processado em</TableHead>
                        <TableHead className="w-32" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lgpd.deletionRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhuma solicitação registrada.
                          </TableCell>
                        </TableRow>
                      ) : lgpd.deletionRequests.slice((pageLgpd - 1) * PAGE_SIZE, pageLgpd * PAGE_SIZE).map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium capitalize">{d.tipo}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
                              d.status === "pendente"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : d.status === "processando"
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}>
                              {d.status === "pendente" && <Clock className="h-3 w-3" />}
                              {d.status === "processando" && <RefreshCw className="h-3 w-3" />}
                              {d.status === "concluido" && <CheckCircle2 className="h-3 w-3" />}
                              {d.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(d.solicitadoEm).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {d.processadoEm ? new Date(d.processadoEm).toLocaleDateString("pt-BR") : "—"}
                          </TableCell>
                          <TableCell>
                            {d.status !== "concluido" && (
                              <div className="flex gap-1.5">
                                {d.status === "pendente" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs"
                                    disabled={lgpdActionLoading === d.id}
                                    onClick={() => updateDeletion(d.id, "processando")}
                                  >
                                    Processar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs text-emerald-700 border-emerald-200"
                                  disabled={lgpdActionLoading === d.id}
                                  onClick={() => updateDeletion(d.id, "concluido")}
                                >
                                  Concluir
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {lgpd.deletionRequests.length > 0 && (
                    <div className="px-4 py-3 border-t">
                      <Pagination total={lgpd.deletionRequests.length} page={pageLgpd} pageSize={PAGE_SIZE} onPageChange={setPageLgpd} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {lgpd.privacyByTipo.length > 0 && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium">Aceites por Documento e Versão</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {lgpd.privacyByTipo.map((p) => (
                        <div key={`${p.tipo}-${p.versao}`} className="flex items-center gap-3">
                          <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">{p.tipo}</span>
                          <span className="text-xs text-muted-foreground">v{p.versao}</span>
                          <span className="flex-1 border-b border-dashed border-border/50" />
                          <span className="text-sm font-semibold tabular-nums">{p._count.id.toLocaleString("pt-BR")}</span>
                          <span className="text-xs text-muted-foreground">aceites</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────────────── */}
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
              onClick={() => selectedOrg && executeAction(selectedOrg.id, "cortesia", {
                cortesiaMotivo: cortesiaMotivo || undefined,
                cortesiaExpiresAt: cortesiaExpiry || null,
              })}
            >
              <Gift className="h-4 w-4 mr-1.5" />Conceder Cortesia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={dialogAcao === "suspender" || dialogAcao === "reativar"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAcao === "suspender" ? "Suspender acesso" : "Reativar organização"}</DialogTitle>
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

      <Dialog open={dialogAcao === "reset-credenciais"} onOpenChange={closeDialog}>
        <DialogContent>
          {!resetResult ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-amber-600" />
                  Resetar acesso de administrador
                </DialogTitle>
                <DialogDescription>
                  Organização: <strong>{selectedOrg?.nome}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <p className="font-medium mb-1">O que será feito:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                    <li>Uma senha temporária será gerada para todos os administradores ativos</li>
                    <li>Todos serão obrigados a trocar a senha no próximo acesso</li>
                    <li>Um e-mail de notificação será enviado a cada administrador</li>
                    <li>Esta ação ficará registrada no log de auditoria</li>
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Justificativa <span className="text-destructive">*</span>
                    <span className="text-muted-foreground font-normal ml-1">(mínimo 10 caracteres)</span>
                  </label>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    rows={3}
                    placeholder="Ex: Solicitação via chamado #123 — admin sem acesso após troca de dispositivo"
                    value={resetJustificativa}
                    onChange={(e) => setResetJustificativa(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {resetJustificativa.trim().length}/10 mínimo
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  disabled={resetJustificativa.trim().length < 10 || actionLoading === selectedOrg?.id}
                  onClick={resetCredenciais}
                >
                  {actionLoading === selectedOrg?.id
                    ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                    : <KeyRound className="h-4 w-4 mr-1.5" />}
                  Resetar acesso
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Acesso resetado com sucesso
                </DialogTitle>
                <DialogDescription>
                  Senha temporária gerada para {resetResult.usuarios.length} administrador{resetResult.usuarios.length > 1 ? "es" : ""} de <strong>{selectedOrg?.nome}</strong>.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usuários afetados</p>
                  {resetResult.usuarios.map((u) => (
                    <div key={u.email} className="flex items-center gap-2 text-sm py-0.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{u.nome}</span>
                      <span className="text-muted-foreground">{u.email}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Senha Temporária</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-base font-bold tracking-widest text-amber-900 bg-white border border-amber-200 rounded px-3 py-2 select-all">
                      {resetResult.senhaTemporaria}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(resetResult.senhaTemporaria).then(() => {
                          toast.success("Senha copiada!");
                        });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1.5" />Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-amber-700 mt-2 font-medium">
                    ⚠ Guarde esta senha agora — ela não será exibida novamente.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Um e-mail de notificação foi enviado a cada administrador. O próximo acesso exigirá troca imediata de senha.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={closeDialog}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogAcao === "plano"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar plano — {selectedOrg?.nome}</DialogTitle>
            <DialogDescription>Plano atual: <strong>{selectedOrg?.planoAssinatura}</strong></DialogDescription>
          </DialogHeader>
          <Select value={novoPlano} onValueChange={(v) => v && setNovoPlano(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="GRATUITO">Gratuito — 1 morada, 30 formandos</SelectItem>
              <SelectItem value="ESSENCIAL">Essencial — 3 moradas, 150 formandos (R$ 149/mês)</SelectItem>
              <SelectItem value="PROFISSIONAL">Profissional — ilimitado (R$ 349/mês)</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              onClick={changePlano}
              disabled={!novoPlano || novoPlano === selectedOrg?.planoAssinatura || actionLoading === selectedOrg?.id}
            >
              Salvar alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
