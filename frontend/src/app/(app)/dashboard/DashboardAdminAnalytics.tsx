"use client";

/**
 * Bloco de BI rico da visão FG/Admin — a camada nova de inteligência da comunidade.
 *
 * Usa dois motores complementares:
 *  - ECharts (via <EChart>): comparativo de presença por morada, com cor por faixa
 *    (verde/âmbar/vermelho), rótulo de % em cada barra e tooltip detalhado.
 *  - Tremor copy-in (<BarList>): ranking de moradas por membros ativos.
 *
 * Importado via next/dynamic (ssr:false) no DashboardClient: o ECharts é pesado e
 * toca em DOM/ResizeObserver, então fica num chunk próprio, fora do primeiro paint.
 *
 * Acessibilidade/inclusão digital: a cor NUNCA carrega sozinha a informação — o
 * número (%) e o nome ficam sempre visíveis; animações respeitam reduced-motion.
 */

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Calendar, Filter, TrendingUp, Users } from "lucide-react";
import { EChart } from "@/components/charts/echart";
import { BarList } from "@/components/charts/bar-list";
import { NIVEL_FORMATIVO_LABELS } from "@/types";
import type { DashboardStats, NivelFormativo } from "@/types";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Faixas do semáforo de presença (mesma régua do resto do dashboard).
function corPresenca(taxa: number): string {
  if (taxa >= 75) return "#10B981"; // emerald
  if (taxa >= 50) return "#F59E0B"; // amber
  return "#EF4444"; // red
}

// Cor por etapa formativa — mesma paleta do gráfico de pizza (DashboardCharts).
const NIVEL_CHART_COLORS: Record<NivelFormativo, string> = {
  "pre-discipulado": "#8B5CF6",
  discipulado: "#3B82F6",
  "primeiras-promessas": "#10B981",
  "formacao-permanente": "#F59E0B",
  vocacional: "#F43F5E",
};

interface Props {
  gruposFormacaoResumo: NonNullable<DashboardStats["gruposFormacaoResumo"]>;
  presencaHeatmap?: DashboardStats["presencaHeatmap"];
  porNivel: DashboardStats["porNivel"];
  termoGrupoFormacao: string;
  termoFormando: string;
}

export default function DashboardAdminAnalytics({
  gruposFormacaoResumo,
  presencaHeatmap,
  porNivel,
  termoGrupoFormacao,
  termoFormando,
}: Props) {
  const router = useRouter();

  // ── ECharts: presença por morada (só moradas com presença medida) ──────────
  const comPresenca = gruposFormacaoResumo.filter((m) => m.taxaPresenca != null);

  const presencaOption = useMemo<EChartsCoreOption>(() => {
    // ascendente: o ECharts desenha a categoria de baixo p/ cima → maior no topo.
    const ordenadas = [...comPresenca].sort((a, b) => (a.taxaPresenca ?? 0) - (b.taxaPresenca ?? 0));
    const info = new Map(ordenadas.map((m) => [m.nome, m]));
    return {
      animation: !prefersReducedMotion,
      grid: { top: 8, right: 44, bottom: 8, left: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const arr = params as { name: string; value: number }[];
          const p = arr[0];
          const m = info.get(p.name);
          const ativos = m ? `${m.formandosAtivos} de ${m.totalFormandos} ${termoFormando.toLowerCase()}s ativos` : "";
          return `<strong>${p.name}</strong><br/>Presença: ${p.value}%<br/>${ativos}`;
        },
      },
      xAxis: {
        type: "value",
        max: 100,
        axisLabel: { formatter: "{value}%", fontSize: 11, color: "#94a3b8" },
        splitLine: { lineStyle: { color: "#f1f5f9" } },
      },
      yAxis: {
        type: "category",
        data: ordenadas.map((m) => m.nome),
        axisLabel: { fontSize: 11, color: "#475569" },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          type: "bar",
          barMaxWidth: 22,
          data: ordenadas.map((m) => ({
            value: m.taxaPresenca ?? 0,
            itemStyle: { color: corPresenca(m.taxaPresenca ?? 0), borderRadius: [0, 4, 4, 0] },
          })),
          label: {
            show: true,
            position: "right",
            formatter: "{c}%",
            fontSize: 11,
            fontWeight: "bold",
            color: "#475569",
          },
        },
      ],
    };
  }, [comPresenca, termoFormando]);

  // ── Tremor BarList: ranking por membros ativos ──────────────────────────────
  const rankingAtivos = useMemo(
    () =>
      [...gruposFormacaoResumo]
        .sort((a, b) => b.formandosAtivos - a.formandosAtivos)
        .slice(0, 8)
        .map((m) => ({
          name: m.nome,
          value: m.formandosAtivos,
          valueLabel: `${m.formandosAtivos}/${m.totalFormandos}`,
          href: `/grupos-formacao/${m.id}`,
        })),
    [gruposFormacaoResumo],
  );

  const chartHeight = Math.max(180, comPresenca.length * 38);

  // ── ECharts: heatmap morada × mês (presença) ────────────────────────────────
  const heatmapOption = useMemo<EChartsCoreOption | null>(() => {
    if (!presencaHeatmap || presencaHeatmap.moradas.length === 0) return null;
    const { meses, moradas, celulas } = presencaHeatmap;
    return {
      animation: !prefersReducedMotion,
      grid: { top: 8, left: 8, right: 16, bottom: 68, containLabel: true },
      tooltip: {
        position: "top",
        formatter: (p: unknown) => {
          const d = (p as { data: [number, number, number | string] }).data;
          const taxa = d[2];
          return `<strong>${moradas[d[1]]?.nome ?? ""}</strong> · ${meses[d[0]] ?? ""}<br/>${
            taxa === "-" ? "Sem sessão no mês" : `Presença: ${taxa}%`
          }`;
        },
      },
      xAxis: {
        type: "category", data: meses, splitArea: { show: true },
        axisLabel: { fontSize: 11, color: "#94a3b8" },
        axisTick: { show: false }, axisLine: { show: false },
      },
      yAxis: {
        type: "category", data: moradas.map((m) => m.nome), splitArea: { show: true },
        axisLabel: { fontSize: 11, color: "#475569" },
        axisTick: { show: false }, axisLine: { show: false },
      },
      visualMap: {
        min: 0, max: 100, calculable: false,
        orient: "horizontal", left: "center", bottom: 2,
        text: ["100%", "0%"], textStyle: { fontSize: 10, color: "#94a3b8" },
        inRange: { color: ["#EF4444", "#F59E0B", "#10B981"] },
      },
      series: [
        {
          type: "heatmap",
          data: celulas.map((c) => [c.x, c.y, c.taxa ?? "-"]),
          label: {
            show: true,
            formatter: (p: unknown) => {
              const v = (p as { data: [number, number, number | string] }).data[2];
              return v === "-" ? "" : `${v}%`;
            },
            fontSize: 10,
            color: "#1f2937",
          },
          itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 4 },
          emphasis: { itemStyle: { shadowBlur: 6, shadowColor: "rgba(0,0,0,0.2)" } },
        },
      ],
    };
  }, [presencaHeatmap]);

  const heatmapHeight = presencaHeatmap ? Math.max(160, presencaHeatmap.moradas.length * 44 + 72) : 0;

  // ── ECharts: funil do caminho formativo (distribuição por etapa) ────────────
  const funilOption = useMemo<EChartsCoreOption | null>(() => {
    if (porNivel.length === 0) return null;
    // maior no topo → o funil "afunila" pelas etapas seguintes.
    const ordenado = [...porNivel].sort((a, b) => b.quantidade - a.quantidade);
    const pctPorNome = new Map(ordenado.map((n) => [NIVEL_FORMATIVO_LABELS[n.nivel], n.percentual]));
    return {
      animation: !prefersReducedMotion,
      tooltip: {
        trigger: "item",
        formatter: (p: unknown) => {
          const { name, value } = p as { name: string; value: number };
          return `<strong>${name}</strong><br/>${value} ${termoFormando.toLowerCase()}s · ${pctPorNome.get(name) ?? 0}%`;
        },
      },
      series: [
        {
          type: "funnel",
          sort: "descending",
          top: 10,
          bottom: 10,
          left: "4%",
          width: "46%",   // funil à esquerda; rótulos ocupam a metade direita
          minSize: "18%", // garante altura mínima legível no segmento mais estreito
          gap: 2,
          // Rótulo à direita com linha-guia: nome + contagem + % SEMPRE visíveis,
          // sem risco de estourar dentro de segmentos estreitos (acessibilidade).
          label: {
            show: true,
            position: "right",
            formatter: (p: unknown) => {
              const { name, value } = p as { name: string; value: number };
              return `${name}: ${value} (${pctPorNome.get(name) ?? 0}%)`;
            },
            color: "#475569",
            fontSize: 12,
          },
          labelLine: { show: true, length: 16, lineStyle: { color: "#cbd5e1" } },
          itemStyle: { borderColor: "#fff", borderWidth: 1 },
          data: ordenado.map((n) => ({
            name: NIVEL_FORMATIVO_LABELS[n.nivel],
            value: n.quantidade,
            itemStyle: { color: NIVEL_CHART_COLORS[n.nivel] },
          })),
        },
      ],
    };
  }, [porNivel, termoFormando]);

  const funilHeight = Math.max(220, porNivel.length * 64);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Inteligência da comunidade</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ECharts — comparativo de presença */}
        <Card className="border-0 shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Presença por {termoGrupoFormacao.toLowerCase()} · últimos 90 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            {comPresenca.length > 0 ? (
              <>
                <EChart
                  option={presencaOption}
                  height={chartHeight}
                  ariaLabel={`Comparativo de presença por ${termoGrupoFormacao.toLowerCase()}`}
                />
                <div className="flex flex-wrap gap-4 mt-2 justify-center">
                  <Legenda cor="bg-emerald-500" texto="Bom (≥75%)" />
                  <Legenda cor="bg-amber-500" texto="Atenção (50–74%)" />
                  <Legenda cor="bg-red-500" texto="Crítico (<50%)" />
                </div>
              </>
            ) : (
              <EmptyState texto={`Sem presença registrada nas ${termoGrupoFormacao.toLowerCase()}s ainda`} />
            )}
          </CardContent>
        </Card>

        {/* Tremor BarList — ranking de membros ativos */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {termoFormando}s ativos por {termoGrupoFormacao.toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rankingAtivos.length > 0 ? (
              <BarList
                data={rankingAtivos}
                onItemClick={(item) => item.href && router.push(item.href)}
              />
            ) : (
              <EmptyState texto={`Nenhuma ${termoGrupoFormacao.toLowerCase()} cadastrada`} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ECharts — funil do caminho formativo (distribuição dos formandos por etapa) */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Caminho formativo · distribuição por etapa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {funilOption ? (
            <EChart
              option={funilOption}
              height={funilHeight}
              ariaLabel={`Funil de distribuição de ${termoFormando.toLowerCase()}s por etapa formativa`}
            />
          ) : (
            <EmptyState texto={`Nenhum ${termoFormando.toLowerCase()} cadastrado por etapa`} />
          )}
        </CardContent>
      </Card>

      {/* ECharts — heatmap morada × mês (só quando há histórico de presença) */}
      {heatmapOption && presencaHeatmap && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Mapa de presença por mês · por {termoGrupoFormacao.toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EChart
              option={heatmapOption}
              height={heatmapHeight}
              ariaLabel={`Mapa de calor de presença por mês e por ${termoGrupoFormacao.toLowerCase()}`}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <div className={`h-2.5 w-2.5 rounded-full ${cor}`} /> {texto}
    </div>
  );
}

function EmptyState({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}
