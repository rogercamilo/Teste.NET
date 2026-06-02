"use client";

import {
  NIVEL_FORMATIVO_LABELS,
  STATUS_FORMACAO_LABELS,
  NIVEL_CORES,
  PERSPECTIV_LABELS,
  NOTA_ADESAO_LABELS,
  NOTA_ADESAO_CORES,
  type NivelFormativo,
  type NotaAdesao,
  type StatusFormacao,
  type DashboardStats,
  type PerfilUsuario,
  type PerspectivFormativa,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  AlertTriangle, BookOpen, Calendar, CheckCircle2, Clock,
  FileText, GitBranch, Home, Plus, TrendingUp,
  User, Users, XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ── Paleta ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<StatusFormacao, string> = {
  agendada: "bg-blue-100 text-blue-700 border-blue-200",
  confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  realizada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-red-100 text-red-600 border-red-200",
  reagendada: "bg-amber-100 text-amber-700 border-amber-200",
};

const NIVEL_CHART_COLORS: Record<NivelFormativo, string> = {
  "pre-discipulado": "#8B5CF6",
  discipulado: "#3B82F6",
  "primeiras-promessas": "#10B981",
  "formacao-permanente": "#F59E0B",
};

const NIVEL_PROGRESS_COLORS: Record<NivelFormativo, string> = {
  "pre-discipulado": "bg-violet-500",
  discipulado: "bg-blue-500",
  "primeiras-promessas": "bg-emerald-500",
  "formacao-permanente": "bg-amber-500",
};

// ── Semáforo ────────────────────────────────────────────────────────────────

function semaforoClasses(taxa: number): { dot: string; bar: string; label: string } {
  if (taxa === -1) return { dot: "bg-slate-300", bar: "bg-slate-200", label: "Sem dados" };
  if (taxa >= 75) return { dot: "bg-emerald-500", bar: "bg-emerald-400", label: `${taxa}%` };
  if (taxa >= 50) return { dot: "bg-amber-400", bar: "bg-amber-400", label: `${taxa}%` };
  return { dot: "bg-red-500", bar: "bg-red-500", label: `${taxa}%` };
}

// ── Perspectiva badge ───────────────────────────────────────────────────────

const PERSPECTIVAS: PerspectivFormativa[] = ["humana", "espiritual", "comunitaria"];

function NotaBadge({ nota }: { nota?: NotaAdesao }) {
  if (!nota) return <span className="text-xs text-muted-foreground/60">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${NOTA_ADESAO_CORES[nota]}`}>
      {NOTA_ADESAO_LABELS[nota]}
    </span>
  );
}

// ── Defaults ───────────────────────────────────────────────────────────────

const EMPTY_STATS: DashboardStats = {
  totalAgendadas: 0, totalRealizadas: 0, totalCanceladas: 0,
  taxaRealizacao: 0, totalFormandos: 0, formandosAtivos: 0,
  evolucaoMensal: [], porNivel: [], proximasFormacoes: [],
};

const PERFIL_SUBTITULO: Record<PerfilUsuario, string> = {
  formador_comunitario: "Visão da sua morada",
  formador_geral: "Visão geral da organização",
  administrador: "Visão geral da organização",
  super_admin: "Plataforma",
};

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  stats: DashboardStats | null;
  perfil: PerfilUsuario;
  moradaNome?: string | null;
  semMorada?: boolean;
}

// ── Componente principal ───────────────────────────────────────────────────

export function DashboardClient({ stats: rawStats, perfil, moradaNome, semMorada }: Props) {
  const router = useRouter();
  const stats = rawStats ?? EMPTY_STATS;
  const isFC = perfil === "formador_comunitario";
  const isAdmin = perfil === "formador_geral" || perfil === "administrador";

  const subtitulo = isFC && moradaNome ? moradaNome : PERFIL_SUBTITULO[perfil];

  if (semMorada) {
    return (
      <div className="space-y-6 animate-in-fast">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão da sua morada —{" "}
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Home className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Sem morada atribuída</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Você ainda não foi associado a uma morada. Entre em contacto com o administrador da sua organização para ser incluído numa morada.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in-fast">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {subtitulo} —{" "}
            {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/agenda" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Calendar className="h-4 w-4 mr-1.5" />
            Ver Agenda
          </Link>
          {!isFC && (
            <Link href="/formacoes/novo" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova Formação
            </Link>
          )}
        </div>
      </div>

      {/* ── KPI row 1 — agendamentos ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Agendadas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalAgendadas}</p>
                <p className="text-xs text-muted-foreground mt-1">Este mês</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar className="h-4.5 w-4.5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Realizadas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalRealizadas}</p>
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Ótimo resultado
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Canceladas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalCanceladas}</p>
                <p className="text-xs text-muted-foreground mt-1">No período</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center">
                <XCircle className="h-4.5 w-4.5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {isFC ? "Presença Geral" : "Taxa de Realização"}
                </p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {isFC
                    ? (stats.taxaPresencaMorada != null ? `${stats.taxaPresencaMorada}%` : "—")
                    : `${stats.taxaRealizacao}%`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isFC ? "Últimos 90 dias" : `${stats.formandosAtivos}/${stats.totalFormandos} ativos`}
                </p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── FG/Admin KPI row 2 — visão estratégica ── */}
      {isAdmin && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Moradas</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.totalMoradas ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.formandosAtivos} formandos ativos</p>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
                    <Home className="h-4.5 w-4.5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-card">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planos Ativos</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.totalPlanosAtivos ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Planos formativos</p>
                  </div>
                  <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FileText className="h-4.5 w-4.5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertas de compliance — só exibe se houver algum problema */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(["moradasSemPlano", "moradasComGradeExpirada", "fcsSemMorada"] as const).map((key) => {
              const val = stats[key] ?? 0;
              const labels: Record<typeof key, { title: string; sub: string }> = {
                moradasSemPlano: { title: "Sem plano", sub: "Moradas sem plano formativo" },
                moradasComGradeExpirada: { title: "Grade expirada", sub: "Moradas com etapa encerrada" },
                fcsSemMorada: { title: "FC sem morada", sub: "Formadores sem morada atribuída" },
              };
              const hasAlert = val > 0;
              return (
                <Card key={key} className={cn("border-0 shadow-sm", hasAlert ? "bg-amber-50" : "bg-card")}>
                  <CardContent className="pt-5 pb-4 px-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {labels[key].title}
                        </p>
                        <p className={cn("text-3xl font-bold mt-1", hasAlert ? "text-amber-600" : "text-foreground")}>
                          {val}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{labels[key].sub}</p>
                      </div>
                      <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", hasAlert ? "bg-amber-100" : "bg-muted")}>
                        <AlertTriangle className={cn("h-4.5 w-4.5", hasAlert ? "text-amber-600" : "text-muted-foreground")} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.evolucaoMensal} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAgendadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRealizadas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Area type="monotone" dataKey="agendadas" name="Agendadas" stroke="#3B82F6" strokeWidth={2} fill="url(#gradAgendadas)" />
                <Area type="monotone" dataKey="realizadas" name="Realizadas" stroke="#10B981" strokeWidth={2} fill="url(#gradRealizadas)" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Agendadas
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Realizadas
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Formandos por Nível</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.porNivel.length > 0 ? (
              <>
                <div className="flex justify-center mb-4">
                  <PieChart width={140} height={140}>
                    <Pie
                      data={stats.porNivel.map((n) => ({ name: NIVEL_FORMATIVO_LABELS[n.nivel], value: n.quantidade }))}
                      cx={65} cy={65} innerRadius={42} outerRadius={60}
                      paddingAngle={3} dataKey="value"
                    >
                      {stats.porNivel.map((n, i) => (
                        <Cell key={i} fill={NIVEL_CHART_COLORS[n.nivel]} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="space-y-2.5">
                  {stats.porNivel.map((item) => (
                    <div key={item.nivel} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: NIVEL_CHART_COLORS[item.nivel] }} />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{NIVEL_FORMATIVO_LABELS[item.nivel]}</span>
                      <span className="text-xs font-semibold text-foreground">{item.quantidade}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right">{item.percentual}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum formando cadastrado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom row — próximas + funil/presença ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Próximas Formações</CardTitle>
              <Link href="/agenda" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
                Ver todas
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.proximasFormacoes.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma formação agendada</p>
              </div>
            ) : (
              stats.proximasFormacoes.map((ag) => (
                <div key={ag.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate leading-tight">{ag.formacaoTema}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(ag.dataInicio), "d 'de' MMM, HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">{ag.formadorNome}</p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[ag.status]}`}>
                    {STATUS_FORMACAO_LABELS[ag.status]}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* FC: funil formativo */}
        {!isAdmin && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">Funil Formativo</CardTitle>
                <Link href="/formandos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {stats.totalFormandos} formandos
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.porNivel.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum formando cadastrado</p>
                </div>
              ) : (
                stats.porNivel.map((item) => (
                  <div key={item.nivel} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{NIVEL_FORMATIVO_LABELS[item.nivel]}</span>
                      <span className="text-muted-foreground">{item.quantidade} · {item.percentual}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${NIVEL_PROGRESS_COLORS[item.nivel]}`}
                        style={{ width: `${item.percentual}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
              {stats.porNivel.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Taxa de realização geral</span>
                    <span className="font-semibold text-emerald-600">{stats.taxaRealizacao}%</span>
                  </div>
                  <Progress value={stats.taxaRealizacao} className="h-1.5 mt-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* FG/Admin: painel de formandos por nível + taxa de realização */}
        {isAdmin && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground">Funil Formativo</CardTitle>
                <Link href="/formandos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
                  <Users className="h-3.5 w-3.5 mr-1" />
                  {stats.totalFormandos} formandos
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.porNivel.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum formando cadastrado</p>
                </div>
              ) : (
                stats.porNivel.map((item) => (
                  <div key={item.nivel} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{NIVEL_FORMATIVO_LABELS[item.nivel]}</span>
                      <span className="text-muted-foreground">{item.quantidade} · {item.percentual}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${NIVEL_PROGRESS_COLORS[item.nivel]}`}
                        style={{ width: `${item.percentual}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
              {stats.porNivel.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Taxa de realização geral</span>
                    <span className="font-semibold text-emerald-600">{stats.taxaRealizacao}%</span>
                  </div>
                  <Progress value={stats.taxaRealizacao} className="h-1.5 mt-1.5" />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── FC: Perspectivas Formativas ── */}
      {isFC && (stats.formandosPresenca?.length ?? 0) > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Perspectivas Formativas</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Última avaliação de adesão por perspectiva</p>
              </div>
              <Link href="/formandos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
                <Users className="h-3.5 w-3.5 mr-1" />
                Ver formandos
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* Cabeçalho das colunas */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_90px_90px_100px] gap-2 mb-2 px-1">
              <span className="text-xs text-muted-foreground font-medium">Formando</span>
              {PERSPECTIVAS.map((p) => (
                <span key={p} className="text-xs text-muted-foreground font-medium text-center">
                  {PERSPECTIV_LABELS[p]}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {(stats.formandosPresenca ?? []).map((f) => (
                <div key={f.id} className="rounded-lg px-1 py-2 hover:bg-muted/40 transition-colors">
                  {/* Nome + semáforo de presença */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${semaforoClasses(f.taxa).dot}`} />
                    <span className="text-sm font-medium text-foreground truncate">{f.nome}</span>
                  </div>
                  {/* Perspectivas — grid em sm+, coluna em mobile */}
                  <div className="sm:grid sm:grid-cols-[1fr_90px_90px_100px] gap-2 flex flex-col gap-y-1 pl-4 sm:pl-0">
                    <div className="hidden sm:block" />
                    {PERSPECTIVAS.map((persp) => (
                      <div key={persp} className="flex items-center justify-between sm:justify-center gap-2">
                        <span className="text-xs text-muted-foreground sm:hidden">{PERSPECTIV_LABELS[persp]}</span>
                        <NotaBadge nota={f.perspectivas?.[persp] as NotaAdesao | undefined} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── FC: Presença e Acompanhamento ── */}
      {isFC && (stats.formandosPresenca?.length ?? 0) > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">Acompanhamento de Presença</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Últimos 90 dias</p>
              </div>
              <Link href="/presenca" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
                Gestão de Presença
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {/* Alertas — formandos com presença crítica */}
            {(() => {
              const criticos = (stats.formandosPresenca ?? []).filter(
                (f) => f.taxa !== -1 && f.taxa < 50 && f.totalSessoes >= 2
              );
              if (criticos.length === 0) return null;
              return (
                <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-700">
                      {criticos.length} formando{criticos.length > 1 ? "s" : ""} com presença crítica (&lt;50%)
                    </p>
                    <p className="text-xs text-red-600 mt-0.5">
                      {criticos.map((f) => f.nome).join(", ")}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2.5">
              {(stats.formandosPresenca ?? []).map((f) => {
                const s = semaforoClasses(f.taxa);
                return (
                  <div key={f.id} className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground truncate">{f.nome}</span>
                        <span className="text-xs font-semibold text-foreground ml-2 shrink-0">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                            style={{ width: f.taxa === -1 ? "0%" : `${f.taxa}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 w-16 text-right">
                          {f.taxa === -1 ? "—" : `${f.sessoesCom}/${f.totalSessoes} sessões`}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${NIVEL_CORES[f.nivelFormativo]}`}>
                      {NIVEL_FORMATIVO_LABELS[f.nivelFormativo]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── FG/Admin: Moradas ── */}
      {isAdmin && (stats.moradasResumo?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Moradas</h2>
            <Link href="/moradas" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(stats.moradasResumo ?? []).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => router.push(`/moradas/${m.id}`)}
                className="text-left rounded-xl border border-border/60 bg-card shadow-sm p-4 hover:shadow-md hover:border-border transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {m.nome}
                    </p>
                    <Badge variant="outline" className={`mt-1 text-xs ${NIVEL_CORES[m.nivelFormativo]}`}>
                      {NIVEL_FORMATIVO_LABELS[m.nivelFormativo]}
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <span className={cn("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium",
                      m.temPlano ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      <FileText className="h-3 w-3" />
                      {m.temPlano ? "Plano" : "Sem plano"}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium",
                      m.gradeVigente ? "bg-emerald-100 text-emerald-700"
                      : m.temGrade ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-600"
                    )}>
                      <GitBranch className="h-3 w-3" />
                      {m.gradeVigente ? "Grade vigente" : m.temGrade ? "Grade encerrada" : "Sem grade"}
                    </span>
                  </div>
                </div>
                {/* Taxa de presença (90 dias) */}
                {m.taxaPresenca != null && (
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Presença (90 dias)</span>
                      <span className={cn("font-semibold",
                        m.taxaPresenca >= 75 ? "text-emerald-600"
                        : m.taxaPresenca >= 50 ? "text-amber-600"
                        : "text-red-600"
                      )}>
                        {m.taxaPresenca}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          m.taxaPresenca >= 75 ? "bg-emerald-500"
                          : m.taxaPresenca >= 50 ? "bg-amber-400"
                          : "bg-red-500"
                        )}
                        style={{ width: `${m.taxaPresenca}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {m.formandosAtivos} de {m.totalFormandos} ativos
                  </span>
                  {m.formadorNome && (
                    <span className="flex items-center gap-1 truncate max-w-[40%]">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.formadorNome}</span>
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
