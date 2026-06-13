"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  LayoutDashboard, Server, Lock, ClipboardList, RefreshCw,
  DollarSign, Building2, Activity, Gift, TrendingUp, TrendingDown, Minus,
  Home, Users, UserSquare, HardDrive, Database, Cloud, CloudOff,
  AlertTriangle, Trash2, ShieldAlert, Send, CheckCircle2, Loader2, type LucideIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";

// ── Types ──────────────────────────────────────────────────────────────────────

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
  crescimento30d: number;
  crescimentoAnterior30d: number;
  crescimentoPercent: number;
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
}

interface LgpdData {
  deletionRequests: {
    id: string; tipo: string; status: string;
    organizacaoId: string | null; usuarioId: string | null;
    solicitadoEm: string; processadoEm: string | null;
  }[];
  deletionStats: { pendentes: number; processando: number; concluidos: number };
  privacyByTipo: { tipo: string; versao: string; _count: { id: number } }[];
  cookieTotal: number;
  cookieAnaliticos: number;
}

interface OrgBasic { id: string; nome: string }

type Tab = "visao-geral" | "servicos" | "seguranca" | "logs" | "lgpd";

interface TabDef { id: Tab; label: string; Icon: LucideIcon }

// ── Helpers ──────────────────────────────────────────────────────────────────

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

const TABS: TabDef[] = [
  { id: "visao-geral", label: "Visão Geral", Icon: LayoutDashboard },
  { id: "servicos", label: "Serviços", Icon: Server },
  { id: "seguranca", label: "Segurança", Icon: Lock },
  { id: "logs", label: "Logs", Icon: ClipboardList },
  { id: "lgpd", label: "LGPD", Icon: ShieldAlert },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>("visao-geral");
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [servicos, setServicos] = useState<ServicosData | null>(null);
  const [seguranca, setSeguranca] = useState<SegurancaData | null>(null);
  const [lgpd, setLgpd] = useState<LgpdData | null>(null);
  const [orgs, setOrgs] = useState<OrgBasic[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [metRes, srvRes, segRes] = await Promise.all([
      fetch("/api/super-admin/metricas").then((r) => r.json()),
      fetch("/api/super-admin/servicos").then((r) => r.json()),
      fetch("/api/super-admin/seguranca").then((r) => r.json()),
    ]);
    setMetricas(metRes);
    setServicos(srvRes);
    setSeguranca(segRes);
    setLoading(false);
  }, []);

  const loadLgpd = useCallback(async () => {
    const [lgpdRes, orgsRes] = await Promise.all([
      fetch("/api/super-admin/lgpd").then((r) => r.json()),
      fetch("/api/super-admin/organizacoes?pageSize=200").then((r) => r.json()),
    ]);
    setLgpd(lgpdRes);
    setOrgs(Array.isArray(orgsRes.data) ? orgsRes.data : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === "lgpd" && !lgpd) loadLgpd();
  }, [tab, lgpd, loadLgpd]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="flex gap-1 border-b pb-0">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-28 bg-muted rounded-t" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  const mrrFmt = metricas
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(metricas.mrrEstimado)
    : "—";

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Cockpit — Formattio</h1>
          <p className="text-xs text-muted-foreground">Monitoramento técnico e operacional da plataforma</p>
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
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {tab === "visao-geral" && metricas && (
        <TabVisaoGeral metricas={metricas} mrrFmt={mrrFmt} />
      )}
      {tab === "servicos" && servicos && (
        <TabServicos data={servicos} />
      )}
      {tab === "seguranca" && seguranca && (
        <TabSeguranca data={seguranca} />
      )}
      {tab === "logs" && seguranca && (
        <TabLogs logs={seguranca.recentLogs} />
      )}
      {tab === "lgpd" && (
        lgpd ? <TabLgpd data={lgpd} orgs={orgs} onRefresh={loadLgpd} /> : (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />Carregando dados LGPD...
          </div>
        )
      )}
    </div>
  );
}

// ── Tab: Visão Geral ──────────────────────────────────────────────────────────

function TabVisaoGeral({ metricas, mrrFmt }: { metricas: Metricas; mrrFmt: string }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />MRR Estimado
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{mrrFmt}</div>
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
                {metricas.crescimentoPercent > 0
                  ? <TrendingUp className="h-3.5 w-3.5" />
                  : metricas.crescimentoPercent < 0
                    ? <TrendingDown className="h-3.5 w-3.5" />
                    : <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
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
            <div className="text-xs text-muted-foreground mt-0.5">organizações isentas de pagamento</div>
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

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium">Totais da plataforma</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {[
              { icon: Users, label: "Formandos", value: metricas.totalFormandos },
              { icon: Home, label: "Moradas", value: metricas.totalGruposFormacao },
              { icon: UserSquare, label: "Usuários", value: metricas.totalUsuarios },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />{label}
                </div>
                <span className="font-semibold text-sm">{value.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Tab: Serviços ─────────────────────────────────────────────────────────────

function TabServicos({ data }: { data: ServicosData }) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              Armazenamento
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                data.storage.provider === "r2"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {data.storage.provider === "r2"
                  ? <span className="flex items-center gap-1"><Cloud className="h-3 w-3 inline" /> Cloudflare R2</span>
                  : <span className="flex items-center gap-1"><CloudOff className="h-3 w-3 inline" /> Disco Local</span>}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total de arquivos</span>
              <span className="font-semibold text-sm">{data.storage.totalArquivos.toLocaleString("pt-BR")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Espaço utilizado</span>
              <span className="font-semibold text-sm">{formatBytes(data.storage.totalBytes)}</span>
            </div>
            {data.topOrgsStorage.length > 0 && (
              <div className="pt-2 border-t space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Top por armazenamento</p>
                {data.topOrgsStorage.map((org) => (
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
                { label: "Formandos", value: data.db.formandos },
                { label: "Moradas", value: data.db.gruposFormacao },
                { label: "Usuários", value: data.db.usuarios },
                { label: "Agendamentos", value: data.db.agendamentos },
                { label: "Presenças", value: data.db.presencas },
                { label: "Formações", value: data.db.formacoes },
                { label: "Arquivos", value: data.db.arquivos },
                { label: "Audit Logs", value: data.db.auditLogs },
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

      {data.recentUploads.length > 0 && (
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
                {data.recentUploads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((u) => (
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
            {data.recentUploads.length > 0 && (
              <div className="px-4 py-3 border-t">
                <Pagination total={data.recentUploads.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Segurança ────────────────────────────────────────────────────────────

function TabSeguranca({ data }: { data: SegurancaData }) {
  const deletionColor = data.deletionPendentes > 0 ? "text-amber-600" : "text-foreground";
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Eventos (24h)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{data.logsCount24h}</div>
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
            <div className={`text-2xl font-bold ${deletionColor}`}>{data.deletionPendentes}</div>
            <div className="text-xs text-muted-foreground mt-0.5">solicitações LGPD</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Aceites Privacidade (7d)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{data.privacyCount7d}</div>
            <div className="text-xs text-muted-foreground mt-0.5">novos aceites</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Ação mais frequente (7d)</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-sm font-bold truncate">
              {data.topAcoes7d[0]?.acao?.replace(/_/g, " ") ?? "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {data.topAcoes7d[0]?._count?.id ?? 0} ocorrências
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
            {data.topAcoes7d.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro.</p>
            ) : data.topAcoes7d.map((a) => (
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
            {data.recentDeletions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação registrada.</p>
            ) : (
              <div className="space-y-2">
                {data.recentDeletions.map((d) => (
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
    </div>
  );
}

// ── Tab: LGPD ─────────────────────────────────────────────────────────────────

function TabLgpd({ data, orgs, onRefresh }: { data: LgpdData; orgs: OrgBasic[]; onRefresh: () => void }) {
  const [orgId, setOrgId] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [dataIncidente, setDataIncidente] = useState("");
  const [medidas, setMedidas] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [formError, setFormError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setResult(null);
    if (!descricao.trim() || !dataIncidente || !medidas.trim()) {
      setFormError("Preencha todos os campos obrigatórios.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/super-admin/lgpd/incidente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizacaoId: orgId || null, descricao, dataIncidente, medidas }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json.error ?? "Erro ao enviar notificações.");
        return;
      }
      setResult(json);
      setDescricao("");
      setDataIncidente("");
      setMedidas("");
      setOrgId("");
    } catch {
      setFormError("Erro de conexão. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-500" />
            Notificação de Incidente de Segurança — LGPD Art. 48
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Notifica titulares de dados pessoais sobre incidentes de segurança que possam acarretar risco ou dano relevante.
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-5">
          {result ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                Notificações enviadas
              </div>
              <p className="text-sm text-emerald-800">
                {result.sent} de {result.total} e-mails enviados com sucesso.
                {result.failed > 0 && ` ${result.failed} falhou(aram).`}
              </p>
              <button
                className="text-xs text-emerald-700 underline mt-1"
                onClick={() => { setResult(null); onRefresh(); }}
              >
                Enviar outra notificação
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
              <div className="space-y-1.5">
                <Label htmlFor="orgId">Organização afetada</Label>
                <select
                  id="orgId"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todas as organizações</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Deixe em branco para notificar todos os usuários da plataforma.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dataIncidente">Data do incidente <span className="text-destructive">*</span></Label>
                <Input
                  id="dataIncidente"
                  type="date"
                  value={dataIncidente}
                  onChange={(e) => setDataIncidente(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descrição do incidente <span className="text-destructive">*</span></Label>
                <Textarea
                  id="descricao"
                  rows={4}
                  placeholder="Descreva o que ocorreu, quais dados podem ter sido afetados e o possível impacto aos titulares."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="medidas">Medidas adotadas <span className="text-destructive">*</span></Label>
                <Textarea
                  id="medidas"
                  rows={3}
                  placeholder="Descreva as ações tomadas para conter o incidente e proteger os titulares."
                  value={medidas}
                  onChange={(e) => setMedidas(e.target.value)}
                  required
                />
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-60 transition-colors"
                >
                  {sending ? (
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
            <CardTitle className="text-xs font-medium text-muted-foreground">Exclusões Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className={`text-2xl font-bold ${data.deletionStats.pendentes > 0 ? "text-amber-600" : "text-foreground"}`}>
              {data.deletionStats.pendentes}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">aguardando processamento</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Aceites de Privacidade</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">
              {data.privacyByTipo.reduce((acc, p) => acc + p._count.id, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">total registrado</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cookies Analíticos</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold">{data.cookieAnaliticos}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              de {data.cookieTotal} consentimentos totais
            </div>
          </CardContent>
        </Card>
      </div>

      {data.deletionRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-muted-foreground" />
              Solicitações de Exclusão — LGPD Art. 18
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Organização</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Processado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.deletionRequests.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm capitalize">{d.tipo}</TableCell>
                    <TableCell>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${
                        d.status === "pendente"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : d.status === "processando"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}>{d.status}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{d.organizacaoId ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(d.solicitadoEm)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.processadoEm ? fmtDate(d.processadoEm) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Tab: Logs ─────────────────────────────────────────────────────────────────

function TabLogs({ logs }: { logs: SegurancaData["recentLogs"] }) {
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">Audit Log — Últimas {logs.length} entradas</CardTitle>
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
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((log) => (
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
        {logs.length > 0 && (
          <div className="px-4 py-3 border-t">
            <Pagination total={logs.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
