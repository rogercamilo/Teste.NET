"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, RefreshCw, Gift, Ban, BadgeCheck, DollarSign, Activity, Lock,
  Shield, Server, Clock, Scale, AlertTriangle, TrendingUp, CalendarPlus,
  Loader2, Mail, CircleAlert, LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { STORAGE_LIMITS } from "./_utils";
import { TabVisaoGeral } from "./_tabs/TabVisaoGeral";
import { TabOrganizacoes } from "./_tabs/TabOrganizacoes";
import { TabFinanceiro } from "./_tabs/TabFinanceiro";
import { TabCortesias } from "./_tabs/TabCortesias";
import { TabInfraestrutura } from "./_tabs/TabInfraestrutura";
import { TabSeguranca } from "./_tabs/TabSeguranca";
import { TabLgpd } from "./_tabs/TabLgpd";
import type {
  OrgRow, Metricas, LgpdData, ServicosData, SegurancaData, DialogAcao, Tab,
} from "./_types";

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: "visao-geral",    label: "Visão Geral",   Icon: LayoutDashboard },
  { id: "organizacoes",   label: "Organizações",  Icon: Building2 },
  { id: "financeiro",     label: "Financeiro",    Icon: DollarSign },
  { id: "cortesias",      label: "Cortesias",     Icon: Gift },
  { id: "infraestrutura", label: "Infraestrutura",Icon: Server },
  { id: "seguranca",      label: "Segurança",     Icon: Lock },
  { id: "lgpd",           label: "LGPD",          Icon: Shield },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SuperAdminClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initTab = searchParams.get("tab") as Tab | null;
  const [tab, setTab] = useState<Tab>(
    TABS.some((x) => x.id === initTab) ? (initTab as Tab) : "visao-geral"
  );

  function handleSetTab(newTab: Tab) {
    setTab(newTab);
    router.replace(`?tab=${newTab}`, { scroll: false });
  }

  // ── Core data ──────────────────────────────────────────────────────────────
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [lgpd, setLgpd] = useState<LgpdData | null>(null);
  const [lgpdLoaded, setLgpdLoaded] = useState(false);
  const [servicos, setServicos] = useState<ServicosData | null>(null);
  const [servicosLoaded, setServicosLoaded] = useState(false);
  const [seguranca, setSeguranca] = useState<SegurancaData | null>(null);
  const [segurancaLoaded, setSegurancaLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metricasError, setMetricasError] = useState<string | null>(null);

  // ── Shared filter state (lives here because alert bar modifies it) ─────────
  const [orgFilter, setOrgFilter] = useState<"all" | "trials" | "fantasmas">("all");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlano, setFilterPlano] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterOnboarding, setFilterOnboarding] = useState(false);

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [dialogAcao, setDialogAcao] = useState<DialogAcao>(null);
  const [novoPlano, setNovoPlano] = useState<string>("");
  const [cortesiaMotivo, setCortesiaMotivo] = useState("");
  const [cortesiaExpiry, setCortesiaExpiry] = useState("");
  const [trialDays, setTrialDays] = useState("30");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Trial reminder ─────────────────────────────────────────────────────────
  const [trialReminderLoading, setTrialReminderLoading] = useState(false);
  const [trialReminderResult, setTrialReminderResult] = useState<{ orgs: number; sent: number; failed: number } | null>(null);

  // ── Loaders ────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setMetricasError(null);
    try {
      const [orgsRes, metRes] = await Promise.all([
        fetch("/api/super-admin/organizacoes"),
        fetch("/api/super-admin/metricas"),
      ]);

      // Handle metricas independently — failure here should not block org management
      if (metRes.ok) {
        setMetricas(await metRes.json() as Metricas);
      } else {
        const body = await metRes.json().catch(() => ({})) as { error?: string };
        const errMsg = `${body.error ?? "Erro desconhecido"} — HTTP ${metRes.status}`;
        setMetricasError(errMsg);
        toast.warning(`Métricas indisponíveis: ${errMsg}`);
      }

      // Orgs are the cockpit's core — failure here shows the error screen
      if (!orgsRes.ok) {
        const body = await orgsRes.json().catch(() => ({})) as { error?: string };
        const msg = `${body.error ?? "Falha ao carregar organizações"} — HTTP ${orgsRes.status}`;
        setLoadError(msg);
        toast.error("Falha ao carregar cockpit.");
        return;
      }

      setOrgs(await orgsRes.json() as OrgRow[]);
    } catch {
      const msg = "Erro de rede. Verifique sua conexão.";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLgpd = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/lgpd");
      if (!res.ok) { toast.error("Falha ao carregar dados LGPD."); return; }
      setLgpd(await res.json() as LgpdData);
      setLgpdLoaded(true);
    } catch { toast.error("Erro de rede."); }
  }, []);

  const loadServicos = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/servicos");
      if (!res.ok) { toast.error("Falha ao carregar dados de infraestrutura."); return; }
      setServicos(await res.json() as ServicosData);
      setServicosLoaded(true);
    } catch { toast.error("Erro de rede."); }
  }, []);

  const loadSeguranca = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/seguranca");
      if (!res.ok) { toast.error("Falha ao carregar dados de segurança."); return; }
      setSeguranca(await res.json() as SegurancaData);
      setSegurancaLoaded(true);
    } catch { toast.error("Erro de rede."); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (tab === "lgpd" && !lgpdLoaded) void loadLgpd(); }, [tab, lgpdLoaded, loadLgpd]);
  useEffect(() => { if (tab === "infraestrutura" && !servicosLoaded) void loadServicos(); }, [tab, servicosLoaded, loadServicos]);
  useEffect(() => { if (tab === "seguranca" && !segurancaLoaded) void loadSeguranca(); }, [tab, segurancaLoaded, loadSeguranca]);

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  function closeDialog() {
    setDialogAcao(null);
    setSelectedOrg(null);
    setCortesiaMotivo("");
    setCortesiaExpiry("");
    setTrialDays("30");
  }

  function handleAction(org: OrgRow, acao: DialogAcao) {
    setSelectedOrg(org);
    if (acao === "plano") setNovoPlano(org.planoAssinatura);
    if (acao === "estender-trial") setTrialDays("30");
    setDialogAcao(acao);
  }

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
        "estender-trial": "trial estendido",
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

  async function sendTrialReminder() {
    setTrialReminderLoading(true);
    setTrialReminderResult(null);
    try {
      const res = await fetch("/api/super-admin/trial-reminder", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Erro ao enviar lembretes."); return; }
      setTrialReminderResult(json);
      toast.success(`${json.sent} lembrete${json.sent !== 1 ? "s" : ""} enviado${json.sent !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setTrialReminderLoading(false);
    }
  }

  function clearAdvancedFilters() {
    setFilterStatus(""); setFilterPlano(""); setFilterTipo(""); setFilterOnboarding(false);
  }

  // ── Derived data ───────────────────────────────────────────────────────────

  const now = Date.now();

  const trialsExpirando = orgs.filter((o) => {
    if (o.status !== "TRIAL" || !o.trialExpiresAt) return false;
    return (new Date(o.trialExpiresAt).getTime() - now) / 86_400_000 <= 7;
  });

  const orgsFantasmas = orgs.filter((o) => {
    if (o.status !== "ATIVO") return false;
    if (!o.lastActivityAt) return true;
    return Math.floor((now - new Date(o.lastActivityAt).getTime()) / 86_400_000) > 30;
  });

  const orgsStorageCritico = orgs.filter((o) => {
    if (o.planoAssinatura === "PERSONALIZADO" || o.planoAssinatura === "GRATUITO") return false;
    const limit = STORAGE_LIMITS[o.planoAssinatura] ?? 0;
    return limit > 0 && o.storageBytes / limit >= 0.8;
  });

  const filteredOrgs = (() => {
    let base: OrgRow[];
    if (orgFilter === "trials") {
      base = orgs
        .filter((o) => {
          if (o.status !== "TRIAL") return false;
          if (!o.trialExpiresAt) return true;
          return (new Date(o.trialExpiresAt).getTime() - now) / 86_400_000 <= 7;
        })
        .sort((a, b) => {
          if (!a.trialExpiresAt) return 1;
          if (!b.trialExpiresAt) return -1;
          return new Date(a.trialExpiresAt).getTime() - new Date(b.trialExpiresAt).getTime();
        });
    } else if (orgFilter === "fantasmas") {
      base = orgs
        .filter((o) => {
          if (o.status !== "ATIVO") return false;
          if (!o.lastActivityAt) return true;
          return Math.floor((now - new Date(o.lastActivityAt).getTime()) / 86_400_000) > 30;
        })
        .sort((a, b) => {
          if (!a.lastActivityAt) return -1;
          if (!b.lastActivityAt) return 1;
          return new Date(a.lastActivityAt).getTime() - new Date(b.lastActivityAt).getTime();
        });
    } else {
      base = orgs;
    }
    if (filterStatus) base = base.filter((o) => o.status === filterStatus);
    if (filterPlano) base = base.filter((o) => o.planoAssinatura === filterPlano);
    if (filterTipo) base = base.filter((o) => o.tipoOrganizacao === filterTipo);
    if (filterOnboarding) base = base.filter((o) => !o.onboardingConcluido);
    return base;
  })();

  const currFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const mrrFmt = metricas ? currFmt.format(metricas.mrrEstimado) : "—";
  const mrrRealFmt = metricas?.mrrReal != null ? currFmt.format(metricas.mrrReal) : null;

  // ── Render ─────────────────────────────────────────────────────────────────

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

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Erro ao carregar o cockpit</p>
          <p className="text-sm text-muted-foreground mt-1">{loadError}</p>
        </div>
        <Button variant="outline" onClick={() => void load()} className="gap-2">
          <RefreshCw className="h-4 w-4" />Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Super Admin — Formattio</h1>
          <p className="text-xs text-muted-foreground">Gestão do negócio, contratos e compliance</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          void load();
          if (servicosLoaded) void loadServicos();
          if (segurancaLoaded) void loadSeguranca();
          if (lgpdLoaded) void loadLgpd();
        }} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />Atualizar
        </Button>
      </div>

      {/* Alert Bar */}
      {(trialsExpirando.length > 0 || orgsFantasmas.length > 0 || (metricas?.deletionsPendentes ?? 0) > 0 || orgsStorageCritico.length > 0) && (
        <div className="flex flex-wrap gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-900">
          {trialsExpirando.length > 0 && (
            <>
              <button
                onClick={() => { handleSetTab("organizacoes"); setOrgFilter("trials"); }}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 font-medium transition-colors"
              >
                <Clock className="h-3.5 w-3.5" />
                {trialsExpirando.length} trial{trialsExpirando.length > 1 ? "s" : ""} expirando em ≤7 dias
              </button>
              <button
                onClick={() => void sendTrialReminder()}
                disabled={trialReminderLoading}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 font-medium transition-colors disabled:opacity-60"
              >
                {trialReminderLoading
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Enviando...</>
                  : <><Mail className="h-3.5 w-3.5" />Enviar lembrete{trialReminderResult != null ? ` (${trialReminderResult.sent} enviados)` : ""}</>}
              </button>
            </>
          )}
          {orgsFantasmas.length > 0 && (
            <button
              onClick={() => { handleSetTab("organizacoes"); setOrgFilter("fantasmas"); }}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 font-medium transition-colors"
            >
              <CircleAlert className="h-3.5 w-3.5" />
              {orgsFantasmas.length} org{orgsFantasmas.length > 1 ? "s" : ""} sem atividade &gt;30 dias
            </button>
          )}
          {(metricas?.deletionsPendentes ?? 0) > 0 && (
            <button
              onClick={() => handleSetTab("lgpd")}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 font-medium transition-colors"
            >
              <Scale className="h-3.5 w-3.5" />
              {metricas!.deletionsPendentes} exclus{metricas!.deletionsPendentes > 1 ? "ões" : "ão"} LGPD pendente{metricas!.deletionsPendentes > 1 ? "s" : ""}
            </button>
          )}
          {orgsStorageCritico.length > 0 && (
            <button
              onClick={() => { handleSetTab("organizacoes"); setFilterStatus("ATIVO"); }}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 font-medium transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {orgsStorageCritico.length} org{orgsStorageCritico.length > 1 ? "s" : ""} com storage &gt;80%
            </button>
          )}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-0 border-b overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => handleSetTab(id)}
            className={`flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "lgpd" && (metricas?.deletionsPendentes ?? lgpd?.deletionStats.pendentes ?? 0) > 0 && (
              <span className="ml-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {metricas?.deletionsPendentes ?? lgpd?.deletionStats.pendentes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "visao-geral" && (
        metricas
          ? <TabVisaoGeral metricas={metricas} currFmt={currFmt} mrrFmt={mrrFmt} />
          : (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="font-medium">Métricas indisponíveis</p>
              {metricasError && <p className="text-xs text-muted-foreground font-mono max-w-sm">{metricasError}</p>}
              <Button variant="outline" size="sm" onClick={() => void load()} className="gap-2 mt-1">
                <RefreshCw className="h-4 w-4" />Tentar novamente
              </Button>
            </div>
          )
      )}

      {tab === "organizacoes" && (
        <TabOrganizacoes
          orgs={orgs}
          filteredOrgs={filteredOrgs}
          orgFilter={orgFilter}
          setOrgFilter={setOrgFilter}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterPlano={filterPlano}
          setFilterPlano={setFilterPlano}
          filterTipo={filterTipo}
          setFilterTipo={setFilterTipo}
          filterOnboarding={filterOnboarding}
          setFilterOnboarding={setFilterOnboarding}
          clearAdvancedFilters={clearAdvancedFilters}
          actionLoading={actionLoading}
          onAction={handleAction}
          onReload={load}
        />
      )}

      {tab === "financeiro" && (
        metricas
          ? <TabFinanceiro metricas={metricas} currFmt={currFmt} mrrFmt={mrrFmt} mrrRealFmt={mrrRealFmt} />
          : (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <p className="font-medium">Métricas financeiras indisponíveis</p>
              {metricasError && <p className="text-xs text-muted-foreground font-mono max-w-sm">{metricasError}</p>}
              <Button variant="outline" size="sm" onClick={() => void load()} className="gap-2 mt-1">
                <RefreshCw className="h-4 w-4" />Tentar novamente
              </Button>
            </div>
          )
      )}

      {tab === "cortesias" && (
        <TabCortesias orgs={orgs} actionLoading={actionLoading} onAction={handleAction} />
      )}

      {tab === "infraestrutura" && (
        <TabInfraestrutura servicos={servicos} />
      )}

      {tab === "seguranca" && (
        <TabSeguranca seguranca={seguranca} />
      )}

      {tab === "lgpd" && (
        <TabLgpd lgpd={lgpd} orgs={orgs} onReload={loadLgpd} />
      )}

      {/* ── Shared Dialogs ─────────────────────────────────────────────────── */}

      <Dialog open={dialogAcao === "estender-trial"} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-blue-600" />
              Estender trial — {selectedOrg?.nome}
            </DialogTitle>
            <DialogDescription>
              {selectedOrg?.trialExpiresAt
                ? `Trial atual expira em ${new Date(selectedOrg.trialExpiresAt).toLocaleDateString("pt-BR")}.`
                : "A organização não tem data de expiração de trial definida."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <label className="text-sm font-medium">Dias a adicionar</label>
            <Input
              type="number" min={1} max={365} value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)} className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              {(() => {
                const d = parseInt(trialDays);
                if (!d || d < 1) return null;
                const base = selectedOrg?.trialExpiresAt && new Date(selectedOrg.trialExpiresAt) > new Date()
                  ? new Date(selectedOrg.trialExpiresAt) : new Date();
                const newDate = new Date(base.getTime() + d * 24 * 60 * 60 * 1000);
                return `Nova data de expiração: ${newDate.toLocaleDateString("pt-BR")}`;
              })()}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!trialDays || parseInt(trialDays) < 1 || actionLoading === selectedOrg?.id}
              onClick={() => selectedOrg && void executeAction(selectedOrg.id, "estender-trial", { trialDays: parseInt(trialDays) })}
            >
              <CalendarPlus className="h-4 w-4 mr-1.5" />Estender
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              onClick={() => selectedOrg && void executeAction(selectedOrg.id, "cortesia", {
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
            <Button variant="destructive" disabled={actionLoading === selectedOrg?.id}
              onClick={() => selectedOrg && void executeAction(selectedOrg.id, "revogar-cortesia")}
            >Revogar cortesia</Button>
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
              onClick={() => selectedOrg && void executeAction(selectedOrg.id, dialogAcao === "suspender" ? "suspender" : "reativar")}
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
            Tem certeza que deseja cancelar o contrato de <strong>&ldquo;{selectedOrg?.nome}&rdquo;</strong>?
            O status será alterado para <strong>CANCELADO</strong> e os usuários não terão mais acesso.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Voltar</Button>
            <Button variant="destructive" disabled={actionLoading === selectedOrg?.id}
              onClick={() => selectedOrg && void executeAction(selectedOrg.id, "cancelar")}
            >Cancelar contrato</Button>
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
            <strong>&ldquo;{selectedOrg?.nome}&rdquo;</strong> — usuários, formandos, formações, documentos e histórico — serão apagados definitivamente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button variant="destructive" disabled={actionLoading === selectedOrg?.id} onClick={() => void deleteOrg()}>
              Excluir permanentemente
            </Button>
          </DialogFooter>
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
              <SelectItem value="GRATUITO">Gratuito — sem assinatura ativa</SelectItem>
              <SelectItem value="BASICO">Básico — até 60 usuários (R$ 97/mês)</SelectItem>
              <SelectItem value="INTERMEDIARIO">Intermediário — até 140 usuários (R$ 197/mês)</SelectItem>
              <SelectItem value="AVANCADO">Avançado — até 350 usuários (R$ 397/mês)</SelectItem>
              <SelectItem value="PERSONALIZADO">Personalizado — ilimitado (negociado)</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button
              onClick={() => void changePlano()}
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
