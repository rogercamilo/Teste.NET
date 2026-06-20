"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Building2, Users, RefreshCw, MoreHorizontal,
  TrendingUp, TrendingDown, AlertTriangle, Gift, Ban, BadgeCheck,
  DollarSign, Activity, Minus, Scale, FileText, CheckCircle2, Clock,
  Shield, KeyRound, CalendarPlus, Search, ExternalLink, CircleAlert,
  Filter, X, BarChart3, LayoutDashboard, Server, Lock, Send,
  Loader2, ShieldAlert, HardDrive, Database, Cloud, CloudOff, Trash2,
  Home, UserSquare, Download, Mail, Bell, type LucideIcon,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// ── Types ──────────────────────────────────────────────────────────────────────

interface OrgRow {
  id: string;
  nome: string;
  planoAssinatura: string;
  tipoOrganizacao: string;
  status: string;
  trialExpiresAt: string | null;
  cortesia: boolean;
  cortesiaExpiresAt: string | null;
  cortesiaMotivo: string | null;
  onboardingConcluido: boolean;
  criadoEm: string;
  lastActivityAt: string | null;
  engajamento7d: number;
  storageBytes: number;
  _count: { gruposFormacao: number; formandos: number; usuarios: number };
}

interface Metricas {
  totalOrgs: number;
  orgsAtivas: number;
  orgsTrials: number;
  orgsSuspensas: number;
  orgsCanceladas: number;
  orgsCortesia: number;
  totalFormandos: number;
  totalGruposFormacao: number;
  totalUsuarios: number;
  planoBreakdown: Record<string, number>;
  mrrEstimado: number;
  mrrReal: number | null;
  deletionsPendentes: number;
  crescimento30d: number;
  crescimentoAnterior30d: number;
  crescimentoPercent: number;
  arr: number;
  ticketMedio: number;
  churnRate30d: number;
  canceladas30d: number;
  receitaEmRisco?: {
    count: number;
    mrrEmRisco: number;
    orgs: { id: string; nome: string; planoAssinatura: string }[];
  };
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

interface ServicosData {
  storage: { provider: "r2" | "local"; totalArquivos: number; totalBytes: number; totalMB: number };
  topOrgsStorage: { organizacaoId: string; nome: string; arquivos: number; bytes: number; mb: number }[];
  db: {
    formandos: number; gruposFormacao: number; usuarios: number; agendamentos: number;
    presencas: number; formacoes: number; auditLogs: number; arquivos: number;
  };
  recentUploads: {
    id: string; nome: string; tamanho: number; tipo: string;
    uploadedByNome: string | null; criadoEm: string; orgNome: string;
  }[];
  comunicacao?: {
    smtpOwnCount: number;
    totalOrgs: number;
    pushTotal: number;
    topOrgsPush: { organizacaoId: string; nome: string; count: number }[];
  };
}

interface SegurancaData {
  recentLogs: {
    id: string; acao: string; ip: string | null; criadoEm: string; detalhes: unknown;
    organizacao: { nome: string } | null;
    usuario: { nome: string; email: string } | null;
  }[];
  topAcoes7d: { acao: string; _count: { id: number } }[];
  deletionPendentes: number;
  recentDeletions: {
    id: string; tipo: string; status: string;
    usuarioId: string | null; organizacaoId: string | null;
    solicitadoEm: string; processadoEm: string | null;
  }[];
  privacyCount7d: number;
  logsCount24h: number;
  superAdminLogs: {
    id: string; acao: string; criadoEm: string; detalhes: unknown;
    organizacao: { nome: string } | null;
    usuario: { nome: string; email: string } | null;
  }[];
}

type DialogAcao = "suspender" | "reativar" | "cancelar" | "plano" | "excluir" | "cortesia" | "revogar-cortesia" | "estender-trial" | null;
type Tab = "visao-geral" | "organizacoes" | "financeiro" | "cortesias" | "infraestrutura" | "seguranca" | "lgpd";


// ── Constants ─────────────────────────────────────────────────────────────────

const MRR_PRICE: Record<string, number> = {
  GRATUITO: 0,
  BASICO: 97,
  INTERMEDIARIO: 197,
  AVANCADO: 397,
  PERSONALIZADO: 890,
};

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

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: "visao-geral", label: "Visão Geral", Icon: LayoutDashboard },
  { id: "organizacoes", label: "Organizações", Icon: Building2 },
  { id: "financeiro", label: "Financeiro", Icon: DollarSign },
  { id: "cortesias", label: "Cortesias", Icon: Gift },
  { id: "infraestrutura", label: "Infraestrutura", Icon: Server },
  { id: "seguranca", label: "Segurança", Icon: Lock },
  { id: "lgpd", label: "LGPD", Icon: Shield },
];

const PAGE_SIZE = 10;

// Storage limits por plano (bytes) — espelho de plan-limits.ts
const STORAGE_LIMITS: Record<string, number> = {
  GRATUITO:     0,
  BASICO:       2  * 1024 * 1024 * 1024,
  INTERMEDIARIO:10 * 1024 * 1024 * 1024,
  AVANCADO:     30 * 1024 * 1024 * 1024,
  PERSONALIZADO:0, // ilimitado — tratado separadamente
};

const TIPO_LABELS: Record<string, string> = {
  nova_comunidade: "Nova Comunidade",
  grupo_oracao: "Grupo de Oração",
  instituto_religioso: "Instituto Religioso",
  centro_formativo: "Centro Formativo",
};

function exportOrgsCSV(orgs: OrgRow[]) {
  const headers = ["Nome", "Tipo", "Status", "Plano", "Formandos", "Grupos", "Usuários", "Storage (MB)", "Onboarding", "Cadastro", "Última Atividade"];
  const rows = orgs.map((o) => [
    o.nome,
    TIPO_LABELS[o.tipoOrganizacao] ?? o.tipoOrganizacao,
    o.status,
    o.planoAssinatura,
    o._count.formandos,
    o._count.gruposFormacao,
    o._count.usuarios,
    (o.storageBytes / (1024 * 1024)).toFixed(2),
    o.onboardingConcluido ? "Concluído" : "Pendente",
    new Date(o.criadoEm).toLocaleDateString("pt-BR"),
    o.lastActivityAt ? new Date(o.lastActivityAt).toLocaleDateString("pt-BR") : "Nunca",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `organizacoes_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const ACAO_CLASS: Record<string, string> = {
  organizacao_deleted: "bg-red-50 text-red-700 border-red-200",
  organizacao_cancelada: "bg-red-50 text-red-600 border-red-100",
  organizacao_suspended: "bg-amber-50 text-amber-700 border-amber-200",
  organizacao_cortesia_concedida: "bg-violet-50 text-violet-700 border-violet-200",
  organizacao_cortesia_revogada: "bg-orange-50 text-orange-700 border-orange-200",
  organizacao_reactivated: "bg-emerald-50 text-emerald-700 border-emerald-200",
  organizacao_plan_changed: "bg-blue-50 text-blue-700 border-blue-200",
  login_success: "bg-slate-50 text-slate-600 border-slate-200",
  login_failure: "bg-red-50 text-red-600 border-red-100",
  login_blocked: "bg-red-50 text-red-700 border-red-200",
  user_created: "bg-emerald-50 text-emerald-700 border-emerald-200",
  user_deleted: "bg-red-50 text-red-600 border-red-100",
};

function engajamentoBadge(count: number) {
  if (count === 0) return null;
  const cls = count >= 30
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : count >= 8
      ? "bg-blue-50 text-blue-600 border-blue-200"
      : "bg-amber-50 text-amber-600 border-amber-200";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full font-medium border ${cls}`}>
      <BarChart3 className="h-2.5 w-2.5" />{count}/7d
    </span>
  );
}

function activityBadge(lastActivityAt: string | null) {
  if (!lastActivityAt) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200">
        Nunca
      </span>
    );
  }
  const days = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86_400_000);
  if (days === 0)
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">Hoje</span>;
  if (days <= 7)
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">{days}d atrás</span>;
  if (days <= 30)
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200">{days}d atrás</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
      <CircleAlert className="h-3 w-3" />{days}d atrás
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

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
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [lgpd, setLgpd] = useState<LgpdData | null>(null);
  const [lgpdLoaded, setLgpdLoaded] = useState(false);
  const [servicos, setServicos] = useState<ServicosData | null>(null);
  const [servicosLoaded, setServicosLoaded] = useState(false);
  const [seguranca, setSeguranca] = useState<SegurancaData | null>(null);
  const [segurancaLoaded, setSegurancaLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [incidenteOrgId, setIncidenteOrgId] = useState<string>("");
  const [incidenteDescricao, setIncidenteDescricao] = useState("");
  const [incidenteDataEvento, setIncidenteDataEvento] = useState("");
  const [incidenteMedidas, setIncidenteMedidas] = useState("");
  const [incidenteSending, setIncidenteSending] = useState(false);
  const [incidenteResult, setIncidenteResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [incidenteError, setIncidenteError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lgpdActionLoading, setLgpdActionLoading] = useState<string | null>(null);
  const [trialReminderLoading, setTrialReminderLoading] = useState(false);
  const [trialReminderResult, setTrialReminderResult] = useState<{ orgs: number; sent: number; failed: number } | null>(null);
  const [pageOrgs, setPageOrgs] = useState(1);
  const [pageCortesias, setPageCortesias] = useState(1);
  const [pageLgpd, setPageLgpd] = useState(1);

  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrgRow | null>(null);
  const [dialogAcao, setDialogAcao] = useState<DialogAcao>(null);
  const [novoPlano, setNovoPlano] = useState<string>("");
  const [cortesiaMotivo, setCortesiaMotivo] = useState("");
  const [cortesiaExpiry, setCortesiaExpiry] = useState("");
  const [trialDays, setTrialDays] = useState("30");
  const [orgFilter, setOrgFilter] = useState<"all" | "trials" | "fantasmas">("all");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlano, setFilterPlano] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterOnboarding, setFilterOnboarding] = useState(false);

  const closeDialog = () => {
    setDialogAcao(null);
    setSelectedOrg(null);
    setCortesiaMotivo("");
    setCortesiaExpiry("");
    setTrialDays("30");
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgsRes, metRes] = await Promise.all([
        fetch("/api/super-admin/organizacoes"),
        fetch("/api/super-admin/metricas"),
      ]);
      if (!orgsRes.ok || !metRes.ok) {
        toast.error("Falha ao carregar dados.");
        return;
      }
      const [orgs, metricas] = await Promise.all([
        orgsRes.json() as Promise<OrgRow[]>,
        metRes.json() as Promise<Metricas>,
      ]);
      setOrgs(orgs);
      setMetricas(metricas);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
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
    } catch {
      toast.error("Erro de rede.");
    }
  }, []);

  const loadServicos = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/servicos");
      if (!res.ok) { toast.error("Falha ao carregar dados de infraestrutura."); return; }
      setServicos(await res.json() as ServicosData);
      setServicosLoaded(true);
    } catch {
      toast.error("Erro de rede.");
    }
  }, []);

  const loadSeguranca = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/seguranca");
      if (!res.ok) { toast.error("Falha ao carregar dados de segurança."); return; }
      setSeguranca(await res.json() as SegurancaData);
      setSegurancaLoaded(true);
    } catch {
      toast.error("Erro de rede.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPageOrgs(1); setPageCortesias(1); }, [orgs]);
  useEffect(() => { setPageOrgs(1); }, [orgFilter, filterStatus, filterPlano, filterTipo, filterOnboarding]);
  useEffect(() => { setPageLgpd(1); }, [lgpd]);

  useEffect(() => {
    if (tab === "lgpd" && !lgpdLoaded) loadLgpd();
  }, [tab, lgpdLoaded, loadLgpd]);

  useEffect(() => {
    if (tab === "infraestrutura" && !servicosLoaded) loadServicos();
  }, [tab, servicosLoaded, loadServicos]);

  useEffect(() => {
    if (tab === "seguranca" && !segurancaLoaded) loadSeguranca();
  }, [tab, segurancaLoaded, loadSeguranca]);

  async function submitIncidente(e: React.FormEvent) {
    e.preventDefault();
    setIncidenteError("");
    setIncidenteResult(null);
    if (!incidenteDescricao.trim() || !incidenteDataEvento || !incidenteMedidas.trim()) {
      setIncidenteError("Preencha todos os campos obrigatórios.");
      return;
    }
    setIncidenteSending(true);
    try {
      const res = await fetch("/api/super-admin/lgpd/incidente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizacaoId: incidenteOrgId || null,
          descricao: incidenteDescricao,
          dataIncidente: incidenteDataEvento,
          medidas: incidenteMedidas,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setIncidenteError(json.error ?? "Erro ao enviar notificações."); return; }
      setIncidenteResult(json);
      setIncidenteDescricao(""); setIncidenteDataEvento(""); setIncidenteMedidas(""); setIncidenteOrgId("");
    } catch {
      setIncidenteError("Erro de conexão. Tente novamente.");
    } finally {
      setIncidenteSending(false);
    }
  }

  async function sendTrialReminder() {
    setTrialReminderLoading(true);
    setTrialReminderResult(null);
    try {
      const res = await fetch("/api/super-admin/trial-reminder", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao enviar lembretes.");
        return;
      }
      setTrialReminderResult(json);
      toast.success(
        `${json.sent} lembrete${json.sent !== 1 ? "s" : ""} enviado${json.sent !== 1 ? "s" : ""} · ${json.orgs} org${json.orgs !== 1 ? "s" : ""} expirando em ≤3 dias`
      );
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setTrialReminderLoading(false);
    }
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

  const currFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const mrrFmt = metricas ? currFmt.format(metricas.mrrEstimado) : "—";
  const mrrRealFmt = metricas?.mrrReal != null ? currFmt.format(metricas.mrrReal) : null;

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
    return search.trim()
      ? base.filter((o) => o.nome.toLowerCase().includes(search.trim().toLowerCase()))
      : base;
  })();

  const hasAdvancedFilter = !!(filterStatus || filterPlano || filterTipo || filterOnboarding);

  function clearAdvancedFilters() {
    setFilterStatus("");
    setFilterPlano("");
    setFilterTipo("");
    setFilterOnboarding(false);
  }
  const cortesiasOrgs = orgs.filter((o) => o.cortesia);

  const orgsStorageCritico = orgs.filter((o) => {
    if (o.planoAssinatura === "PERSONALIZADO" || o.planoAssinatura === "GRATUITO") return false;
    const limit = STORAGE_LIMITS[o.planoAssinatura] ?? 0;
    if (!limit) return false;
    return o.storageBytes / limit >= 0.8;
  });

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

      {/* ── Tab: Visão Geral ─────────────────────────────────────────────────── */}
      {tab === "visao-geral" && metricas && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />MRR
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {metricas.mrrReal != null ? (
                  <>
                    <div className="text-2xl font-bold">{currFmt.format(metricas.mrrReal)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      real via Stripe <span className="text-slate-400">· est. {mrrFmt}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{mrrFmt}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">receita estimada</div>
                  </>
                )}
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
                    {metricas.crescimentoPercent > 0
                      ? <TrendingUp className="h-3.5 w-3.5" />
                      : metricas.crescimentoPercent < 0
                        ? <TrendingDown className="h-3.5 w-3.5" />
                        : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                    {metricas.crescimentoPercent > 0 ? "+" : ""}{metricas.crescimentoPercent}%
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  vs {metricas.crescimentoAnterior30d} no período anterior
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />Churn Rate (30d)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`text-2xl font-bold ${metricas.churnRate30d > 5 ? "text-red-600" : metricas.churnRate30d > 0 ? "text-amber-600" : ""}`}>
                  {metricas.churnRate30d}%
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {metricas.canceladas30d} org{metricas.canceladas30d !== 1 ? "s" : ""} cancelada{metricas.canceladas30d !== 1 ? "s" : ""}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
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
                <CardTitle className="text-sm font-medium">Distribuição de planos</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {[
                  { label: "Gratuito", key: "GRATUITO", color: "bg-slate-400" },
                  { label: "Básico", key: "BASICO", color: "bg-sky-500" },
                  { label: "Intermediário", key: "INTERMEDIARIO", color: "bg-violet-500" },
                  { label: "Avançado", key: "AVANCADO", color: "bg-amber-500" },
                  { label: "Personalizado", key: "PERSONALIZADO", color: "bg-emerald-500" },
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

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Totais da plataforma</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {[
                  { icon: Users, label: "Formandos", value: metricas.totalFormandos },
                  { icon: Home, label: "Grupos de Formação", value: metricas.totalGruposFormacao },
                  { icon: UserSquare, label: "Usuários", value: metricas.totalUsuarios },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />{label}
                    </div>
                    <span className="font-semibold text-sm tabular-nums">{value.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
                <div className="pt-2 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">ARR</span>
                    <span className="font-semibold text-sm tabular-nums">{currFmt.format(metricas.arr)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Ticket médio</span>
                    <span className="font-semibold text-sm tabular-nums">{currFmt.format(metricas.ticketMedio)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Cortesias ativas</span>
                    <span className="font-semibold text-sm tabular-nums">{metricas.orgsCortesia}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab: Organizações ────────────────────────────────────────────────── */}
      {tab === "organizacoes" && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4 gap-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Organizações ({filteredOrgs.length}{search.trim() || orgFilter !== "all" || hasAdvancedFilter ? ` de ${orgs.length}` : ""})
              </CardTitle>
              <button
                onClick={() => exportOrgsCSV(filteredOrgs)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1 hover:bg-muted transition-colors"
                title="Exportar lista como CSV"
              >
                <Download className="h-3.5 w-3.5" />Exportar CSV
              </button>
            </div>

            {/* Quick-filter badges (trials / fantasmas) */}
            {orgFilter !== "all" && (
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${
                  orgFilter === "trials"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-red-100 text-red-800 border-red-300"
                }`}>
                  {orgFilter === "trials" ? <Clock className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
                  {orgFilter === "trials" ? "Trials expirando ≤7 dias" : "Sem atividade >30 dias"}
                </span>
                <button
                  onClick={() => setOrgFilter("all")}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Limpar
                </button>
              </div>
            )}

            {/* Advanced filters */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(!v || v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs w-32 gap-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos status</SelectItem>
                  <SelectItem value="ATIVO">Ativo</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPlano || "__all__"} onValueChange={(v) => setFilterPlano(!v || v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs w-36 gap-1">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos planos</SelectItem>
                  <SelectItem value="GRATUITO">Gratuito</SelectItem>
                  <SelectItem value="BASICO">Básico</SelectItem>
                  <SelectItem value="INTERMEDIARIO">Intermediário</SelectItem>
                  <SelectItem value="AVANCADO">Avançado</SelectItem>
                  <SelectItem value="PERSONALIZADO">Personalizado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTipo || "__all__"} onValueChange={(v) => setFilterTipo(!v || v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs w-44 gap-1">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos tipos</SelectItem>
                  <SelectItem value="nova_comunidade">Nova Comunidade</SelectItem>
                  <SelectItem value="grupo_oracao">Grupo de Oração</SelectItem>
                  <SelectItem value="instituto_religioso">Instituto Religioso</SelectItem>
                  <SelectItem value="centro_formativo">Centro Formativo</SelectItem>
                </SelectContent>
              </Select>

              <button
                onClick={() => setFilterOnboarding((v) => !v)}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterOnboarding
                    ? "bg-orange-100 text-orange-700 border-orange-300"
                    : "bg-background text-muted-foreground border-border hover:border-muted-foreground/50"
                }`}
              >
                <Filter className="h-3 w-3" />Onboarding incompleto
              </button>

              {hasAdvancedFilter && (
                <button
                  onClick={clearAdvancedFilters}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />Limpar filtros
                </button>
              )}

              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPageOrgs(1); }}
                  className="pl-8 h-7 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Grupos</TableHead>
                  <TableHead className="text-center">Formandos</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead>Atividade</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrgs.slice((pageOrgs - 1) * PAGE_SIZE, pageOrgs * PAGE_SIZE).map((org) => {
                  const trialExpired = org.trialExpiresAt && new Date(org.trialExpiresAt) < new Date();
                  const cortesiaExpired = org.cortesiaExpiresAt && new Date(org.cortesiaExpiresAt) < new Date();
                  return (
                    <TableRow key={org.id} className={org.cortesia ? "bg-violet-50/40 dark:bg-violet-950/10" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              className="font-medium hover:underline hover:text-primary text-left"
                              onClick={() => router.push(`/super-admin/organizacoes/${org.id}`)}
                            >
                              {org.nome}
                            </button>
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
                          {!org.onboardingConcluido && org.status !== "CANCELADO" && (
                            <span className="text-xs text-orange-600 flex items-center gap-0.5">
                              <CircleAlert className="h-3 w-3" />Onboarding incompleto
                            </span>
                          )}
                          {(() => {
                            if (org.planoAssinatura === "PERSONALIZADO" || org.planoAssinatura === "GRATUITO") return null;
                            const limit = STORAGE_LIMITS[org.planoAssinatura] ?? 0;
                            if (!limit) return null;
                            const pct = Math.round((org.storageBytes / limit) * 100);
                            if (pct < 60) return null;
                            const isHigh = pct >= 80;
                            return (
                              <span className={`text-xs flex items-center gap-0.5 ${isHigh ? "text-red-600" : "text-amber-600"}`}>
                                <AlertTriangle className="h-3 w-3" />
                                Storage {pct}% ({formatBytes(org.storageBytes)} / {formatBytes(limit)})
                              </span>
                            );
                          })()}
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
                      <TableCell className="text-center text-sm">{org._count.gruposFormacao}</TableCell>
                      <TableCell className="text-center text-sm">{org._count.formandos}</TableCell>
                      <TableCell className="text-center text-sm">{org._count.usuarios}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {activityBadge(org.lastActivityAt)}
                          {engajamentoBadge(org.engajamento7d)}
                        </div>
                      </TableCell>
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
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => router.push(`/super-admin/organizacoes/${org.id}`)}>
                              <ExternalLink className="h-4 w-4 mr-2" />Ver detalhes
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => { setSelectedOrg(org); setNovoPlano(org.planoAssinatura); setDialogAcao("plano"); }}>
                              <TrendingUp className="h-4 w-4 mr-2" />Alterar plano
                            </DropdownMenuItem>

                            {(org.status === "TRIAL" || (org.trialExpiresAt !== null)) && (
                              <DropdownMenuItem onClick={() => { setSelectedOrg(org); setTrialDays("30"); setDialogAcao("estender-trial"); }}>
                                <CalendarPlus className="h-4 w-4 mr-2" />Estender trial
                              </DropdownMenuItem>
                            )}

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

                            <DropdownMenuItem onClick={() => router.push(`/super-admin/organizacoes/${org.id}/reset-credenciais`)}>
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
                {filteredOrgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                      {search.trim() ? "Nenhuma organização encontrada para a busca." : "Nenhuma organização cadastrada."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {filteredOrgs.length > 0 && (
              <div className="px-4 py-3 border-t">
                <Pagination total={filteredOrgs.length} page={pageOrgs} pageSize={PAGE_SIZE} onPageChange={setPageOrgs} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Tab: Financeiro ──────────────────────────────────────────────────── */}
      {tab === "financeiro" && metricas && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />MRR
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {mrrRealFmt !== null ? (
                  <>
                    <div className="text-3xl font-bold">{mrrRealFmt}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      receita real via Stripe
                      <span className="block text-slate-400 mt-0.5">estimado: {mrrFmt}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold">{mrrFmt}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      receita estimada
                      <span className="block text-slate-400 mt-0.5">Stripe não configurado</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />ARR
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-3xl font-bold">{currFmt.format(metricas.arr)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  receita anual recorrente
                  <span className="block text-slate-400 mt-0.5">ticket médio {currFmt.format(metricas.ticketMedio)}/org</span>
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
                  <TrendingDown className="h-3.5 w-3.5" />Churn Rate (30d)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`text-3xl font-bold ${metricas.churnRate30d > 5 ? "text-red-600" : metricas.churnRate30d > 0 ? "text-amber-600" : ""}`}>
                  {metricas.churnRate30d}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {metricas.canceladas30d} org{metricas.canceladas30d !== 1 ? "s" : ""} cancelada{metricas.canceladas30d !== 1 ? "s" : ""} nos últimos 30d
                </div>
              </CardContent>
            </Card>
          </div>

          {metricas.receitaEmRisco && metricas.receitaEmRisco.count > 0 && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 dark:bg-red-950/20 dark:border-red-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  Receita em risco: {currFmt.format(metricas.receitaEmRisco.mrrEmRisco)}/mês
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  {metricas.receitaEmRisco.count} org{metricas.receitaEmRisco.count > 1 ? "s" : ""} suspensa{metricas.receitaEmRisco.count > 1 ? "s" : ""} com assinatura Stripe ativa:{" "}
                  {metricas.receitaEmRisco.orgs.map((o) => o.nome).join(", ")}
                </p>
              </div>
            </div>
          )}

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
                    { label: "Básico", key: "BASICO", color: "bg-sky-100 text-sky-700" },
                    { label: "Intermediário", key: "INTERMEDIARIO", color: "bg-violet-100 text-violet-700" },
                    { label: "Avançado", key: "AVANCADO", color: "bg-amber-100 text-amber-700" },
                    { label: "Personalizado", key: "PERSONALIZADO", color: "bg-emerald-100 text-emerald-700" },
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
                    <TableCell className="text-right">
                      {mrrRealFmt !== null ? (
                        <span className="flex flex-col items-end gap-0.5">
                          <span>{mrrRealFmt} <span className="font-normal text-xs text-emerald-600">real</span></span>
                          <span className="text-xs font-normal text-muted-foreground">{mrrFmt} estimado</span>
                        </span>
                      ) : mrrFmt}
                    </TableCell>
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
                  { icon: Building2, label: "Grupos", value: metricas.totalGruposFormacao },
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
                                {expired ? "Expirada — " : ""}
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

      {/* ── Tab: Infraestrutura ──────────────────────────────────────────────── */}
      {tab === "infraestrutura" && (
        servicos ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    Armazenamento
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                      servicos.storage.provider === "r2"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {servicos.storage.provider === "r2"
                        ? <span className="flex items-center gap-1"><Cloud className="h-3 w-3 inline" /> Cloudflare R2</span>
                        : <span className="flex items-center gap-1"><CloudOff className="h-3 w-3 inline" /> Disco Local</span>}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total de arquivos</span>
                    <span className="font-semibold text-sm">{servicos.storage.totalArquivos.toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Espaço utilizado</span>
                    <span className="font-semibold text-sm">{formatBytes(servicos.storage.totalBytes)}</span>
                  </div>
                  {servicos.topOrgsStorage.length > 0 && (
                    <div className="pt-2 border-t space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Top por armazenamento</p>
                      {servicos.topOrgsStorage.map((org) => (
                        <div key={org.organizacaoId} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate">{org.nome}</span>
                          <span className="text-muted-foreground">{org.arquivos} arqs</span>
                          <span className="font-medium w-16 text-right">{formatBytes(org.bytes)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    Banco de Dados
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
                      PostgreSQL
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      { label: "Formandos", value: servicos.db.formandos },
                      { label: "Grupos", value: servicos.db.gruposFormacao },
                      { label: "Usuários", value: servicos.db.usuarios },
                      { label: "Agendamentos", value: servicos.db.agendamentos },
                      { label: "Presenças", value: servicos.db.presencas },
                      { label: "Formações", value: servicos.db.formacoes },
                      { label: "Arquivos", value: servicos.db.arquivos },
                      { label: "Audit Logs", value: servicos.db.auditLogs },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-0.5 border-b border-dashed border-border/50">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-xs font-semibold tabular-nums">{value.toLocaleString("pt-BR")}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {servicos.comunicacao && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />Comunicação
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-3">
                    <div className="flex justify-between items-center py-0.5 border-b border-dashed border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="h-3 w-3" />SMTP próprio</span>
                      <span className="text-xs font-semibold tabular-nums">
                        {servicos.comunicacao.smtpOwnCount} / {servicos.comunicacao.totalOrgs} orgs
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-dashed border-border/50">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Bell className="h-3 w-3" />Push subs</span>
                      <span className="text-xs font-semibold tabular-nums">{servicos.comunicacao.pushTotal}</span>
                    </div>
                  </div>
                  {servicos.comunicacao.topOrgsPush.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Top por push</p>
                      {servicos.comunicacao.topOrgsPush.map((o) => (
                        <div key={o.organizacaoId} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 truncate">{o.nome}</span>
                          <span className="font-medium tabular-nums">{o.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {servicos.recentUploads.length > 0 && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">Uploads Recentes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Organização</TableHead>
                        <TableHead>Enviado por</TableHead>
                        <TableHead className="text-right">Tamanho</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servicos.recentUploads.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium text-sm max-w-56 truncate">{u.nome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.orgNome}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{u.uploadedByNome ?? "—"}</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">{formatBytes(u.tamanho)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{fmtDate(u.criadoEm)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando dados de infraestrutura...
          </div>
        )
      )}

      {/* ── Tab: Segurança ───────────────────────────────────────────────────── */}
      {tab === "seguranca" && (
        seguranca ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Eventos (24h)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold">{seguranca.logsCount24h}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">ações registradas</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Trash2 className="h-3.5 w-3.5" />Exclusões Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className={`text-2xl font-bold ${seguranca.deletionPendentes > 0 ? "text-amber-600" : ""}`}>
                    {seguranca.deletionPendentes}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">solicitações LGPD</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Aceites Privacidade (7d)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-2xl font-bold">{seguranca.privacyCount7d}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">novos aceites</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">Ação mais frequente (7d)</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-sm font-bold truncate">
                    {seguranca.topAcoes7d[0]?.acao?.replace(/_/g, " ") ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {seguranca.topAcoes7d[0]?._count?.id ?? 0} ocorrências
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium">Top ações — últimos 7 dias</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                  {seguranca.topAcoes7d.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum registro.</p>
                  ) : seguranca.topAcoes7d.map((a) => (
                    <div key={a.acao} className="flex items-center gap-2">
                      <span className="text-xs bg-muted rounded px-1.5 py-0.5 font-mono flex-1 truncate">{a.acao}</span>
                      <span className="text-sm font-semibold tabular-nums w-8 text-right">{a._count.id}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Solicitações de Exclusão (LGPD)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {seguranca.recentDeletions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma solicitação registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {seguranca.recentDeletions.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded-full border font-medium ${
                            d.status === "pendente"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : d.status === "processando"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}>{d.status}</span>
                          <span className="text-muted-foreground capitalize">{d.tipo}</span>
                          <span className="text-muted-foreground ml-auto">
                            {new Date(d.solicitadoEm).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Ações do Super Admin — últimos 30 dias ({seguranca.superAdminLogs?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Operador</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!seguranca.superAdminLogs?.length ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          Nenhuma ação de super admin nos últimos 30 dias.
                        </TableCell>
                      </TableRow>
                    ) : seguranca.superAdminLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium font-mono ${
                            ACAO_CLASS[log.acao] ?? "bg-muted text-muted-foreground border-border"
                          }`}>
                            {log.acao}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.organizacao?.nome ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.usuario?.nome ?? log.usuario?.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(log.criadoEm)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-medium">Audit Log — Últimas {seguranca.recentLogs.length} entradas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ação</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seguranca.recentLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    ) : seguranca.recentLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium font-mono ${
                            ACAO_CLASS[log.acao] ?? "bg-muted text-muted-foreground border-border"
                          }`}>
                            {log.acao}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.organizacao?.nome ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.usuario?.nome ?? log.usuario?.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ip ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtDate(log.criadoEm)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando dados de segurança...
          </div>
        )
      )}

      {/* ── Tab: LGPD ─────────────────────────────────────────────────────────── */}
      {tab === "lgpd" && (
        <div className="space-y-6">
          {!lgpd ? (
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
              </div>
              <div className="h-64 bg-muted rounded-xl" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    Notificação de Incidente de Segurança — LGPD Art. 48
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Notifica titulares de dados pessoais sobre incidentes que possam acarretar risco ou dano relevante.
                  </p>
                </CardHeader>
                <CardContent className="px-4 pb-5">
                  {incidenteResult ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-700 font-medium">
                        <CheckCircle2 className="h-5 w-5" />
                        Notificações enviadas
                      </div>
                      <p className="text-sm text-emerald-800">
                        {incidenteResult.sent} de {incidenteResult.total} e-mails enviados com sucesso.
                        {incidenteResult.failed > 0 && ` ${incidenteResult.failed} falhou(aram).`}
                      </p>
                      <button
                        className="text-xs text-emerald-700 underline mt-1"
                        onClick={() => setIncidenteResult(null)}
                      >
                        Enviar outra notificação
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={submitIncidente} className="space-y-4 max-w-xl">
                      <div className="space-y-1.5">
                        <Label>Organização afetada</Label>
                        <Select value={incidenteOrgId || "__all__"} onValueChange={(v) => setIncidenteOrgId(!v || v === "__all__" ? "" : v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">Todas as organizações</SelectItem>
                            {orgs.map((o) => (
                              <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">Deixe em branco para notificar todos os usuários da plataforma.</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="incidenteData">Data do incidente <span className="text-destructive">*</span></Label>
                        <Input
                          id="incidenteData"
                          type="date"
                          value={incidenteDataEvento}
                          onChange={(e) => setIncidenteDataEvento(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="incidenteDescricao">Descrição do incidente <span className="text-destructive">*</span></Label>
                        <Textarea
                          id="incidenteDescricao"
                          rows={4}
                          placeholder="Descreva o que ocorreu, quais dados podem ter sido afetados e o possível impacto."
                          value={incidenteDescricao}
                          onChange={(e) => setIncidenteDescricao(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="incidenteMedidas">Medidas adotadas <span className="text-destructive">*</span></Label>
                        <Textarea
                          id="incidenteMedidas"
                          rows={3}
                          placeholder="Descreva as ações tomadas para conter o incidente e proteger os titulares."
                          value={incidenteMedidas}
                          onChange={(e) => setIncidenteMedidas(e.target.value)}
                          required
                        />
                      </div>

                      {incidenteError && <p className="text-sm text-destructive">{incidenteError}</p>}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="submit"
                          disabled={incidenteSending}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-60 transition-colors"
                        >
                          {incidenteSending ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                          ) : (
                            <><Send className="h-4 w-4" />Enviar notificação</>
                          )}
                        </button>
                        <p className="text-xs text-muted-foreground">Esta ação envia e-mails imediatamente aos titulares.</p>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>

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
              type="number"
              min={1}
              max={365}
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              {(() => {
                const d = parseInt(trialDays);
                if (!d || d < 1) return null;
                const base = selectedOrg?.trialExpiresAt && new Date(selectedOrg.trialExpiresAt) > new Date()
                  ? new Date(selectedOrg.trialExpiresAt)
                  : new Date();
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
              onClick={() => selectedOrg && executeAction(selectedOrg.id, "estender-trial", { trialDays: parseInt(trialDays) })}
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
