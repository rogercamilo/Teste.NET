"use client";

// Dashboard executivo do perfil FUNDADOR ("CEO" da comunidade). Composição de
// informação ~60% executiva / 25% tática / 15% operacional: lidera com KPIs de
// alto nível + visuais macro; depois "onde agir" (tático); rodapé operacional
// enxuto. Reusa DashboardCharts e DashboardAdminAnalytics (mesmos dados do ramo
// FG/Admin) — ver page.tsx (getDashboardData, delta `executivo`).

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, CalendarClock,
  CheckCircle2, GitBranch, Home, TrendingUp, Users, type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type DashboardStats } from "@/types";

const DashboardCharts = dynamic(() => import("./DashboardCharts"), {
  loading: () => <div className="h-[288px] rounded-xl bg-muted/40 animate-pulse" aria-hidden />,
});
const DashboardAdminAnalytics = dynamic(() => import("./DashboardAdminAnalytics"), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-xl bg-muted/40 animate-pulse" aria-hidden />,
});

type Termos = { grupoFormacao: string; formando: string };

// ── KPI card (executivo) ─────────────────────────────────────────────────────

function Kpi({
  icon: Icon, rotulo, valor, sufixo, detalhe, tendencia,
}: {
  icon: LucideIcon;
  rotulo: string;
  valor: string | number;
  sufixo?: string;
  detalhe?: string;
  tendencia?: { dir: "up" | "down" | "flat"; texto: string };
}) {
  const TrendIcon = tendencia?.dir === "up" ? ArrowUpRight : tendencia?.dir === "down" ? ArrowDownRight : ArrowRight;
  const trendCor = tendencia?.dir === "up" ? "text-success" : tendencia?.dir === "down" ? "text-destructive" : "text-muted-foreground";
  return (
    <Card className="gap-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-medium">{rotulo}</span>
        </div>
        <p className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          {valor}{sufixo && <span className="text-xl font-semibold text-muted-foreground">{sufixo}</span>}
        </p>
        {(detalhe || tendencia) && (
          <div className="mt-1 flex items-center gap-1.5 text-xs">
            {tendencia && (
              <span className={cn("inline-flex items-center gap-0.5 font-medium", trendCor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                {tendencia.texto}
              </span>
            )}
            {detalhe && <span className="text-muted-foreground">{detalhe}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Linha "onde agir" (tático) ───────────────────────────────────────────────

function AcaoRow({
  rotulo, quantidade, href,
}: { rotulo: string; quantidade: number; href: string }) {
  const atencao = quantidade > 0;
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ring-1 ring-foreground/10 hover:bg-muted/50 transition-colors"
    >
      <span className="flex items-center gap-2 text-sm">
        {atencao
          ? <AlertTriangle className="h-4 w-4 text-warning" />
          : <CheckCircle2 className="h-4 w-4 text-success" />}
        <span className="text-foreground">{rotulo}</span>
      </span>
      <span className={cn("text-sm font-semibold", atencao ? "text-warning" : "text-muted-foreground")}>
        {quantidade}
      </span>
    </Link>
  );
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function DashboardExecutivo({
  stats, termos, tituloSaudacao, subtitulo,
}: {
  stats: DashboardStats;
  termos: Termos;
  tituloSaudacao: string;
  subtitulo: string;
}) {
  const ex = stats.executivo;
  const moradas = stats.gruposFormacaoResumo ?? [];
  const moradasBaixaPresenca = moradas.filter((m) => m.taxaPresenca !== null && m.taxaPresenca !== undefined && m.taxaPresenca < 60);

  // Crescimento: total de ingressos na janela + tendência (último mês vs média).
  const novosTotal = ex?.crescimentoMensal.reduce((s, m) => s + m.novos, 0) ?? 0;
  const ultimoMes = ex?.crescimentoMensal.at(-1)?.novos ?? 0;

  // Tendência de presença: compara o último mês com dados vs o primeiro com dados.
  const serie = (ex?.presencaTendencia ?? []).filter((p) => p.taxa !== null) as { mes: string; taxa: number }[];
  const presTrend = serie.length >= 2
    ? (() => {
        const delta = serie[serie.length - 1].taxa - serie[0].taxa;
        return { dir: delta > 2 ? "up" as const : delta < -2 ? "down" as const : "flat" as const, texto: `${delta >= 0 ? "+" : ""}${delta} p.p.` };
      })()
    : undefined;

  const proximas = stats.proximasFormacoes.slice(0, 3);
  const totalMoradas = moradas.length;

  return (
    <div className="space-y-6 animate-in-fast">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-title text-foreground">{tituloSaudacao}</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          <span className="normal-case text-muted-foreground/80"> · {subtitulo}</span>
        </p>
      </div>

      {/* ── EXECUTIVO (≈60%) — KPIs de alto nível ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi
          icon={Users}
          rotulo={termos.formando + "s"}
          valor={stats.totalFormandos}
          detalhe={`${stats.formandosAtivos} ativos`}
          tendencia={novosTotal > 0 ? { dir: "up", texto: `+${novosTotal} em 6 meses` } : undefined}
        />
        <Kpi
          icon={TrendingUp}
          rotulo="Retenção"
          valor={ex?.retencaoPct ?? 0}
          sufixo="%"
          detalhe={ex ? `${ex.inativos} inativos` : undefined}
        />
        <Kpi
          icon={CheckCircle2}
          rotulo="Presença global"
          valor={ex?.taxaPresencaGlobal ?? "—"}
          sufixo={ex?.taxaPresencaGlobal != null ? "%" : undefined}
          detalhe="últimos 90 dias"
          tendencia={presTrend}
        />
        <Kpi
          icon={GitBranch}
          rotulo="Jornada média"
          valor={ex?.progressoMedioJornada ?? 0}
          sufixo="%"
          detalhe="da etapa atual"
        />
        <Kpi
          icon={Home}
          rotulo={termos.grupoFormacao + "s"}
          valor={totalMoradas}
          detalhe={`${moradas.filter((m) => m.gradeVigente).length} com grade vigente`}
        />
      </div>

      {/* Visão macro: evolução + distribuição */}
      <DashboardCharts
        evolucaoMensal={stats.evolucaoMensal}
        porNivel={stats.porNivel}
        termoFormando={termos.formando}
      />

      {/* BI rico: funil, sankey da jornada, heatmap de presença */}
      {totalMoradas > 0 && (
        <DashboardAdminAnalytics
          gruposFormacaoResumo={moradas}
          presencaHeatmap={stats.presencaHeatmap}
          porNivel={stats.porNivel}
          sankeyJornada={stats.sankeyJornada}
          termoGrupoFormacao={termos.grupoFormacao}
          termoFormando={termos.formando}
        />
      )}

      {/* ── TÁTICO (≈25%) — onde agir ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="text-heading text-foreground">Onde agir</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <AcaoRow rotulo={`${termos.grupoFormacao}s com presença baixa`} quantidade={moradasBaixaPresenca.length} href="/grupos-formacao" />
            <AcaoRow rotulo={`${termos.grupoFormacao}s sem plano`} quantidade={stats.gruposFormacaoSemPlano ?? 0} href="/grupos-formacao" />
            <AcaoRow rotulo={`${termos.grupoFormacao}s sem grade`} quantidade={stats.gruposFormacaoSemGrade ?? 0} href="/grupos-formacao" />
            <AcaoRow rotulo="Grades expiradas" quantidade={stats.gruposFormacaoComGradeExpirada ?? 0} href="/grades" />
            <AcaoRow rotulo={`Formadores sem ${termos.grupoFormacao.toLowerCase()}`} quantidade={stats.fcsSemGrupoFormacao ?? 0} href="/configuracoes" />
          </div>
        </CardContent>
      </Card>

      {/* ── OPERACIONAL (≈15%) — próximos encontros ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-heading text-foreground">Próximos encontros</h2>
            </div>
            <Link href="/agenda" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              Ver agenda <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nenhum encontro agendado.</p>
          ) : (
            <ul className="divide-y divide-border">
              {proximas.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-sm text-foreground truncate">{a.formacaoTema}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(a.dataInicio), "d MMM, HH:mm", { locale: ptBR })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
