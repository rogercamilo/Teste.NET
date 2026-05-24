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
  AlertTriangle, Trash2, type LucideIcon,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface ServicosData {
  storage: { provider: "r2" | "local"; totalArquivos: number; totalBytes: number; totalMB: number };
  topOrgsStorage: { organizacaoId: string; nome: string; arquivos: number; bytes: number; mb: number }[];
  db: {
    formandos: number; moradas: number; usuarios: number; agendamentos: number;
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

type Tab = "visao-geral" | "servicos" | "seguranca" | "logs";

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
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardClient() {
  const [tab, setTab] = useState<Tab>("visao-geral");
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [servicos, setServicos] = useState<ServicosData | null>(null);
  const [seguranca, setSeguranca] = useState<SegurancaData | null>(null);
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

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="flex gap-1 border-b pb-0">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-9 w-28 bg-muted rounded-t" />)}
        </div>
        <div className="grid grid-cols-4 gap-4">
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Cockpit — Formatio</h1>
            <p className="text-xs text-muted-foreground">Monitoramento técnico e operacional da plataforma</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-4 w-4" />Atualizar
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-0 border-b">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
              { icon: Home, label: "Moradas", value: metricas.totalMoradas },
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
                { label: "Moradas", value: data.db.moradas },
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
                {data.recentUploads.map((u) => (
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

// ── Tab: Logs ─────────────────────────────────────────────────────────────────

function TabLogs({ logs }: { logs: SegurancaData["recentLogs"] }) {
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
            ) : logs.map((log) => (
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
  );
}
