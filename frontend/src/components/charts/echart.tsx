"use client";

/**
 * Wrapper único do Apache ECharts para toda a plataforma.
 *
 * Por que ECharts (e não só recharts): o recharts cobre bem os gráficos básicos
 * (área, barra, pizza) do dashboard; o ECharts entra para a camada de BI rica —
 * heatmap, sankey, treemap, gauge, barras com rótulo por item e animações fluidas
 * que o recharts não entrega com a mesma naturalidade.
 *
 * CSP: renderer **canvas** sempre. O app roda sob `script-src nonce+strict-dynamic`
 * e `style-src 'self' 'unsafe-inline'`. O canvas desenha sem injetar <style> nem
 * usar eval, então não viola a política. (O renderer SVG injetaria estilos e é
 * evitado de propósito.) Este componente deve ser carregado via `next/dynamic`
 * (ssr:false) pelos consumidores — o ECharts toca em DOM/ResizeObserver e é pesado;
 * mantê-lo fora do bundle inicial preserva o primeiro paint.
 */

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart, HeatmapChart, RadarChart, FunnelChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  VisualMapComponent,
  DatasetComponent,
} from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

// Registro explícito (tree-shaking): só o que a plataforma usa hoje. Para um novo
// tipo de gráfico, adicione o módulo correspondente aqui — não troque para o import
// "echarts" cheio, que dobraria o bundle.
echarts.use([
  BarChart, LineChart, PieChart, HeatmapChart, RadarChart, FunnelChart,
  GridComponent, TooltipComponent, LegendComponent, TitleComponent,
  VisualMapComponent, DatasetComponent,
  LabelLayout, CanvasRenderer,
]);

interface EChartProps {
  option: EChartsCoreOption;
  /** Altura em px (o ECharts precisa de altura explícita). Default 280. */
  height?: number;
  className?: string;
  /** Rótulo acessível do gráfico (a imagem canvas é opaca a leitores de tela). */
  ariaLabel?: string;
}

export function EChart({ option, height = 280, className, ariaLabel }: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null);

  // Instância criada uma vez; o container vira o canvas.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: "canvas" });
    chartRef.current = chart;

    // Reage ao redimensionamento do container (sidebar abrindo/fechando, resize),
    // não só da janela — o ResizeObserver cobre os dois casos.
    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Atualiza a opção sem recriar a instância (transições animadas do ECharts).
  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true });
  }, [option]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height }}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
