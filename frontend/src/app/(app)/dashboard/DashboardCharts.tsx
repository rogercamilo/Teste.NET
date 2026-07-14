"use client";

/**
 * Gráficos do dashboard (recharts) isolados num chunk próprio.
 *
 * recharts é uma dependência pesada; mantê-la fora do bundle inicial do
 * DashboardClient reduz o JS carregado no primeiro paint. Este componente é
 * importado via `next/dynamic` (client-side, com skeleton) — só baixa quando o
 * dashboard renderiza, e nunca bloqueia a hidratação do resto da página.
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NIVEL_FORMATIVO_LABELS, type DashboardStats, type NivelFormativo } from "@/types";

const NIVEL_CHART_COLORS: Record<NivelFormativo, string> = {
  "pre-discipulado": "#8B5CF6",
  discipulado: "#3B82F6",
  "primeiras-promessas": "#10B981",
  "formacao-permanente": "#F59E0B",
  vocacional: "#F43F5E",
};

interface Props {
  evolucaoMensal: DashboardStats["evolucaoMensal"];
  porNivel: DashboardStats["porNivel"];
  termoFormando: string;
}

export default function DashboardCharts({ evolucaoMensal, porNivel, termoFormando }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="border-0 shadow-sm lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={evolucaoMensal} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
          <CardTitle className="text-sm font-semibold text-foreground">{termoFormando}s por Nível</CardTitle>
        </CardHeader>
        <CardContent>
          {porNivel.length > 0 ? (
            <>
              <div className="flex justify-center mb-4">
                <PieChart width={140} height={140}>
                  <Pie
                    data={porNivel.map((n) => ({ name: NIVEL_FORMATIVO_LABELS[n.nivel], value: n.quantidade }))}
                    cx={65} cy={65} innerRadius={42} outerRadius={60}
                    paddingAngle={3} dataKey="value"
                  >
                    {porNivel.map((n, i) => (
                      <Cell key={i} fill={NIVEL_CHART_COLORS[n.nivel]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="space-y-2.5">
                {porNivel.map((item) => (
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
              <p className="text-sm text-muted-foreground">Nenhum {termoFormando.toLowerCase()} cadastrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
