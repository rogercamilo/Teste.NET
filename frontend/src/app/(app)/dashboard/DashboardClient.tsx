"use client";

import type { ReactNode } from "react";
import {
  NIVEL_FORMATIVO_LABELS,
  STATUS_FORMACAO_LABELS,
  NIVEL_CORES,
  PERSPECTIVA_LABELS,
  NOTA_ADESAO_LABELS,
  NOTA_ADESAO_CORES,
  type NivelFormativo,
  type NotaAdesao,
  type StatusFormacao,
  type DashboardStats,
  type PerfilUsuario,
  type PerspectivaFormativa,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { buttonVariants } from "@/components/ui/button";
import dynamic from "next/dynamic";
import {
  AlertTriangle, BookOpen, Calendar, CheckCircle2, Clock,
  FileText, GitBranch, Home, Plus, TrendingUp,
  User, Users, XCircle, type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTermos } from "@/lib/data-store";
import { MinhaSemana } from "./MinhaSemana";
import { saudacaoPorHora, primeiroNome } from "@/lib/dashboard-semana";

// recharts é pesado — carrega num chunk próprio, só quando o dashboard renderiza.
const DashboardCharts = dynamic(() => import("./DashboardCharts"), {
  loading: () => <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-hidden><div className="h-[288px] rounded-xl bg-muted/40 animate-pulse lg:col-span-2" /><div className="h-[288px] rounded-xl bg-muted/40 animate-pulse" /></div>,
});

// ── Paleta ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<StatusFormacao, string> = {
  agendada: "bg-blue-100 text-blue-700 border-blue-200",
  confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  realizada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-red-100 text-red-600 border-red-200",
  reagendada: "bg-amber-100 text-amber-700 border-amber-200",
};

const NIVEL_PROGRESS_COLORS: Record<NivelFormativo, string> = {
  "pre-discipulado": "bg-violet-500",
  discipulado: "bg-blue-500",
  "primeiras-promessas": "bg-emerald-500",
  "formacao-permanente": "bg-amber-500",
  vocacional: "bg-rose-500",
};

// ── Semáforo ────────────────────────────────────────────────────────────────

function semaforoClasses(taxa: number): { dot: string; bar: string; label: string } {
  if (taxa === -1) return { dot: "bg-slate-300", bar: "bg-slate-200", label: "Sem dados" };
  if (taxa >= 75) return { dot: "bg-emerald-500", bar: "bg-emerald-400", label: `${taxa}%` };
  if (taxa >= 50) return { dot: "bg-amber-400", bar: "bg-amber-400", label: `${taxa}%` };
  return { dot: "bg-red-500", bar: "bg-red-500", label: `${taxa}%` };
}

// ── Perspectiva badge ───────────────────────────────────────────────────────

const PERSPECTIVAS: PerspectivaFormativa[] = ["humana", "espiritual", "comunitaria"];

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
  formador_comunitario: "",
  formador_pedagogico: "Elaboração do caminho formativo",
  formador_geral: "Visão geral da organização",
  administrador: "Visão geral da organização",
  super_admin: "Plataforma",
};

// ── Dashboard do Formador Pedagógico: bloco de KPIs de um domínio de conteúdo ──
type ConteudoTone = "ok" | "warn" | "alert" | "muted";
const CONTEUDO_TONE_CLASSES: Record<ConteudoTone, string> = {
  ok: "text-emerald-600",
  warn: "text-amber-600",
  alert: "text-red-500",
  muted: "text-foreground",
};

function ConteudoBloco({
  titulo,
  icon: Icon,
  href,
  itens,
}: {
  titulo: string;
  icon: LucideIcon;
  href: string;
  itens: { label: string; value: number; tone: ConteudoTone }[];
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {titulo}
          </CardTitle>
          <Link href={href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {itens.map((it) => (
            <div key={it.label} className="rounded-lg bg-muted/40 p-3">
              <p className={cn("text-2xl font-bold", CONTEUDO_TONE_CLASSES[it.tone])}>{it.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{it.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Funil Formativo card (shared between FC and FG/Admin views) ─────────────

function FunilFormativoCard({ stats, termos }: { stats: DashboardStats; termos: ReturnType<typeof useTermos> }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">Funil Formativo</CardTitle>
          <Link href="/formandos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
            <Users className="h-3.5 w-3.5 mr-1" />
            {stats.totalFormandos} {termos.formando.toLowerCase()}s
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.porNivel.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum {termos.formando.toLowerCase()} cadastrado</p>
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
  );
}

// ── Próximas Formações (compartilhado FC / FG / Admin) ──────────────────────

function ProximasFormacoesCard({ stats }: { stats: DashboardStats }) {
  return (
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
  );
}

// ── FC: Perspectivas Formativas (adesão por perspectiva) ────────────────────

function PerspectivasCard({ stats, termos }: { stats: DashboardStats; termos: ReturnType<typeof useTermos> }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-foreground">Perspectivas Formativas</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Última avaliação de adesão por perspectiva</p>
          </div>
          <Link href="/formandos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
            <Users className="h-3.5 w-3.5 mr-1" />
            Ver {termos.formando.toLowerCase()}s
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="hidden sm:grid sm:grid-cols-[1fr_90px_90px_100px] gap-2 mb-2 px-1">
          <span className="text-xs text-muted-foreground font-medium">{termos.formando}</span>
          {PERSPECTIVAS.map((p) => (
            <span key={p} className="text-xs text-muted-foreground font-medium text-center">
              {PERSPECTIVA_LABELS[p]}
            </span>
          ))}
        </div>
        <div className="space-y-2">
          {(stats.formandosPresenca ?? []).map((f) => (
            <div key={f.id} className="rounded-lg px-1 py-2 hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`h-2 w-2 rounded-full shrink-0 ${semaforoClasses(f.taxa).dot}`} />
                <span className="text-sm font-medium text-foreground truncate">{f.nome}</span>
              </div>
              <div className="sm:grid sm:grid-cols-[1fr_90px_90px_100px] gap-2 flex flex-col gap-y-1 pl-4 sm:pl-0">
                <div className="hidden sm:block" />
                {PERSPECTIVAS.map((persp) => (
                  <div key={persp} className="flex items-center justify-between sm:justify-center gap-2">
                    <span className="text-xs text-muted-foreground sm:hidden">{PERSPECTIVA_LABELS[persp]}</span>
                    <NotaBadge nota={f.perspectivas?.[persp] as NotaAdesao | undefined} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── FC: Acompanhamento de Presença (semáforo por formando, 90 dias) ─────────

function AcompanhamentoPresencaCard({ stats, termos }: { stats: DashboardStats; termos: ReturnType<typeof useTermos> }) {
  return (
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
  );
}

// ── FC: sinais de pessoa (hero) + painéis de jornada ────────────────────────

function KpiPessoa({
  valor, label, sub, alerta = false, onClick,
}: {
  valor: string | number; label: string; sub?: string; alerta?: boolean; onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="text-left" disabled={!onClick}>
      <Card className={cn("border-0 shadow-sm h-full transition-shadow", onClick && "hover:shadow-md", alerta && "bg-amber-50/70")}>
        <CardContent className="pt-5 pb-4 px-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={cn("text-3xl font-bold mt-1 flex items-center gap-1.5", alerta ? "text-amber-700" : "text-foreground")}>
            {alerta && <AlertTriangle className="h-5 w-5" />}
            {valor}
          </p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </CardContent>
      </Card>
    </button>
  );
}

function iniciais(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function JornadaListaCard({
  titulo, icon: Icon, tone, count, children,
}: {
  titulo: string; icon: LucideIcon; tone: "amber" | "emerald"; count: number; children: ReactNode;
}) {
  const borda = tone === "amber" ? "border-l-amber-400" : "border-l-emerald-400";
  const iconColor = tone === "amber" ? "text-amber-500" : "text-emerald-500";
  const badgeColor = tone === "amber"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <Card className={cn("border-0 shadow-sm border-l-2", borda)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Icon className={cn("h-4 w-4", iconColor)} />
          {titulo}
          <Badge variant="outline" className={cn("ml-1", badgeColor)}>{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  stats: DashboardStats | null;
  perfil: PerfilUsuario;
  grupoFormacaoNome?: string | null;
  semMorada?: boolean;
  nomeUsuario?: string | null;
}

// ── Componente principal ───────────────────────────────────────────────────

export function DashboardClient({ stats: rawStats, perfil, grupoFormacaoNome, semMorada, nomeUsuario }: Props) {
  const router = useRouter();
  const termos = useTermos();
  const stats = rawStats ?? EMPTY_STATS;
  const isFC = perfil === "formador_comunitario";
  const isAdmin = perfil === "formador_geral" || perfil === "administrador";

  const primeiro = primeiroNome(nomeUsuario);
  const tituloSaudacao = primeiro ? `${saudacaoPorHora()}, ${primeiro}` : saudacaoPorHora();

  const subtitulo = isFC
    ? (grupoFormacaoNome ?? `Visão da sua ${termos.grupoFormacao.toLowerCase()}`)
    : PERFIL_SUBTITULO[perfil];

  if (semMorada) {
    return (
      <div className="space-y-6 animate-in-fast">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{tituloSaudacao}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão da sua {termos.grupoFormacao.toLowerCase()} —{" "}
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Home className="h-7 w-7 text-muted-foreground/60" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">Sem {termos.grupoFormacao.toLowerCase()} atribuída</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Você ainda não foi associado a uma {termos.grupoFormacao.toLowerCase()}. Entre em contacto com o administrador da sua organização para ser incluído numa {termos.grupoFormacao.toLowerCase()}.
          </p>
        </div>
      </div>
    );
  }

  // ── Formador Pedagógico: dashboard de elaboração do caminho formativo ──────
  if (perfil === "formador_pedagogico") {
    const c = stats.conteudo;
    return (
      <div className="space-y-6 animate-in-fast">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{tituloSaudacao}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span className="normal-case text-muted-foreground/80"> · {subtitulo}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/planos/novo" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              <Plus className="h-4 w-4 mr-1.5" /> Novo Plano
            </Link>
            <Link href="/formacoes/novo" className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="h-4 w-4 mr-1.5" /> Nova Formação
            </Link>
          </div>
        </div>

        {!c ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Ainda não há conteúdo formativo cadastrado. Comece criando um plano.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Planos */}
            <ConteudoBloco
              titulo="Planos Formativos"
              icon={BookOpen}
              href="/planos"
              itens={[
                { label: "Ativos", value: c.planos.ativos, tone: "ok" },
                { label: "Em rascunho", value: c.planos.rascunho, tone: c.planos.rascunho > 0 ? "warn" : "muted" },
                { label: "Em revisão", value: c.planos.emRevisao, tone: c.planos.emRevisao > 0 ? "warn" : "muted" },
                { label: "Incompletos", value: c.planos.incompletos, tone: c.planos.incompletos > 0 ? "alert" : "muted" },
                { label: "Vigência expirada", value: c.planos.vigenciaExpirada, tone: c.planos.vigenciaExpirada > 0 ? "alert" : "muted" },
              ]}
            />

            {/* Grades */}
            <ConteudoBloco
              titulo="Grades Formativas"
              icon={GitBranch}
              href="/grades"
              itens={[
                { label: "Total", value: c.grades.total, tone: "muted" },
                { label: "Vazias", value: c.grades.vazias, tone: c.grades.vazias > 0 ? "alert" : "muted" },
                { label: "Incompletas", value: c.grades.incompletas, tone: c.grades.incompletas > 0 ? "warn" : "muted" },
                { label: "Não revisadas", value: c.grades.naoRevisadas, tone: c.grades.naoRevisadas > 0 ? "warn" : "ok" },
                { label: "Inativas", value: c.grades.inativas, tone: c.grades.inativas > 0 ? "warn" : "muted" },
              ]}
            />

            {/* Formações */}
            <ConteudoBloco
              titulo="Formações (no caminho formativo)"
              icon={FileText}
              href="/formacoes"
              itens={[
                { label: "Elaboradas", value: c.formacoes.totalElaboradas, tone: "ok" },
                { label: "Em esboço", value: c.formacoes.esboco, tone: c.formacoes.esboco > 0 ? "alert" : "muted" },
                { label: "Sem material", value: c.formacoes.semMaterial, tone: c.formacoes.semMaterial > 0 ? "warn" : "muted" },
                { label: "Não revisadas", value: c.formacoes.naoRevisadas, tone: c.formacoes.naoRevisadas > 0 ? "warn" : "ok" },
              ]}
            />

            {/* O que precisa da minha atenção */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  O que precisa da minha atenção
                </CardTitle>
              </CardHeader>
              <CardContent>
                {c.atencao.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Tudo em dia — nenhum item pendente.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {c.atencao.map((a) => (
                      <Link
                        key={`${a.tipo}-${a.id}`}
                        href={`/${a.tipo === "plano" ? "planos" : a.tipo === "grade" ? "grades" : "formacoes"}/${a.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0 capitalize">
                          {a.tipo === "plano" ? "Plano" : a.tipo === "grade" ? "Grade" : "Formação"}
                        </span>
                        <span className="text-sm font-medium truncate flex-1">{a.nome}</span>
                        <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                          {a.motivo}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    );
  }

  // ── Formador Comunitário: cockpit da morada (pessoas e jornada primeiro) ────
  if (isFC) {
    const atencao = stats.formandosAtencao ?? [];
    const prontos = stats.formandosProntos ?? [];
    const temPresenca = (stats.formandosPresenca?.length ?? 0) > 0;
    return (
      <div className="space-y-6 animate-in-fast">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{tituloSaudacao}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              <span className="normal-case text-muted-foreground/80"> · {subtitulo}</span>
            </p>
          </div>
          <Link href="/agenda" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Calendar className="h-4 w-4 mr-1.5" />
            Ver Agenda
          </Link>
        </div>

        {/* Sinais de pessoa — cada card salta para a área correspondente */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiPessoa
            valor={stats.formandosAtivos}
            label={`${termos.formando}s ativos`}
            sub={`de ${stats.totalFormandos} ${termos.formando.toLowerCase()}s`}
            onClick={() => router.push("/formandos")}
          />
          <KpiPessoa
            valor={`${stats.progressoMedioEtapa ?? 0}%`}
            label="Progresso da etapa"
            sub="Média da morada"
          />
          <KpiPessoa
            valor={stats.taxaPresencaGrupoFormacao != null ? `${stats.taxaPresencaGrupoFormacao}%` : "—"}
            label="Presença"
            sub="Últimos 90 dias"
            onClick={() => router.push("/presenca")}
          />
          <KpiPessoa
            valor={atencao.length}
            label="Precisam de atenção"
            alerta={atencao.length > 0}
            sub={atencao.length > 0 ? "Requerem acompanhamento" : "Todos no ritmo"}
          />
        </div>

        {/* Precisam de atenção — motor de risco unificado (ritmo + presença) */}
        {atencao.length > 0 && (
          <JornadaListaCard titulo="Precisam de atenção" icon={AlertTriangle} tone="amber" count={atencao.length}>
            {atencao.map((m) => (
              <Link
                key={m.id}
                href={`/formandos/${m.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <span className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", NIVEL_CORES[m.nivelFormativo])}>
                  {iniciais(m.nome)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.nome}</p>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {m.motivos.map((motivo, i) => (
                      <span key={i} className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {motivo}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">{m.pct}%</span>
              </Link>
            ))}
          </JornadaListaCard>
        )}

        {/* Prontos para avançar — cumpriram os requisitos da etapa */}
        {prontos.length > 0 && (
          <JornadaListaCard titulo="Prontos para avançar" icon={CheckCircle2} tone="emerald" count={prontos.length}>
            {prontos.map((m) => (
              <Link
                key={m.id}
                href={`/formandos/${m.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <span className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0", NIVEL_CORES[m.nivelFormativo])}>
                  {iniciais(m.nome)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {NIVEL_FORMATIVO_LABELS[m.nivelFormativo]} · {m.done}/{m.total} requisitos
                  </p>
                </div>
                <span className="text-xs font-medium text-emerald-600 tabular-nums shrink-0">Concluiu</span>
              </Link>
            ))}
          </JornadaListaCard>
        )}

        {/* Minha semana (item 2.2) */}
        <MinhaSemana stats={stats} perfil={perfil} termos={termos} />

        {/* Acompanhamento de presença + perspectivas (evolução de cada um) */}
        {temPresenca && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AcompanhamentoPresencaCard stats={stats} termos={termos} />
            <PerspectivasCard stats={stats} termos={termos} />
          </div>
        )}

        {/* Contexto — próximos encontros + funil da jornada */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProximasFormacoesCard stats={stats} />
          <FunilFormativoCard stats={stats} termos={termos} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in-fast">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{tituloSaudacao}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            <span className="normal-case text-muted-foreground/80"> · {subtitulo}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/agenda" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            <Calendar className="h-4 w-4 mr-1.5" />
            Ver Agenda
          </Link>
          <Link href="/formacoes/novo" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Formação
          </Link>
        </div>
      </div>

      {/* ── Minha semana (item 2.2) ── */}
      <MinhaSemana stats={stats} perfil={perfil} termos={termos} />

      {/* ── KPI row 1 — agendamentos ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-card">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formações Agendadas</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formações Realizadas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalRealizadas}</p>
                <p className="text-xs text-muted-foreground mt-1">Este mês</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Formações Canceladas</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.totalCanceladas}</p>
                <p className="text-xs text-muted-foreground mt-1">Este mês</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Taxa de Realização</p>
                <p className="text-3xl font-bold text-foreground mt-1">{stats.taxaRealizacao}%</p>
                <p className="text-xs text-muted-foreground mt-1">Realizadas ÷ decididas este mês</p>
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
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total de {termos.grupoFormacao}s</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.totalGruposFormacao ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{termos.grupoFormacao}s cadastradas</p>
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
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Planos Formativos</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{stats.totalPlanosAtivos ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">{termos.grupoFormacao}s com plano em vigor</p>
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
            {(["gruposFormacaoSemPlano", "gruposFormacaoComGradeExpirada", "fcsSemGrupoFormacao"] as const).map((key) => {
              const val = stats[key] ?? 0;
              const labels: Record<typeof key, { title: string; sub: string }> = {
                gruposFormacaoSemPlano: { title: `${termos.grupoFormacao}s sem plano`, sub: "Aguardando planejamento formativo" },
                gruposFormacaoComGradeExpirada: { title: `${termos.grupoFormacao}s sem grade vigente`, sub: "Requerem nova programação" },
                fcsSemGrupoFormacao: { title: `Formadores sem ${termos.grupoFormacao.toLowerCase()}`, sub: `Aguardando atribuição de ${termos.grupoFormacao.toLowerCase()}` },
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

      {/* ── Charts row (recharts em chunk dinâmico) ── */}
      <DashboardCharts
        evolucaoMensal={stats.evolucaoMensal}
        porNivel={stats.porNivel}
        termoFormando={termos.formando}
      />

      {/* ── Bottom row — próximas + funil ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProximasFormacoesCard stats={stats} />
        <FunilFormativoCard stats={stats} termos={termos} />
      </div>

      {/* ── FG/Admin: Moradas ── */}
      {isAdmin && (stats.gruposFormacaoResumo?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{termos.grupoFormacao}s</h2>
            <Link href="/grupos-formacao" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs")}>
              Ver todas
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(stats.gruposFormacaoResumo ?? []).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => router.push(`/grupos-formacao/${m.id}`)}
                className="text-left rounded-xl border border-border/60 bg-card shadow-sm p-4 hover:shadow-md hover:border-border transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {m.nome}
                    </p>
                    {m.nivelFormativo ? (
                      <Badge variant="outline" className={`mt-1 text-xs ${NIVEL_CORES[m.nivelFormativo]}`}>
                        {NIVEL_FORMATIVO_LABELS[m.nivelFormativo]}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="mt-1 text-xs bg-slate-100 text-slate-600 border-slate-200">
                        Livre
                      </Badge>
                    )}
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
                    {m.formandosAtivos} de {m.totalFormandos} {termos.formando.toLowerCase()}s ativos
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
