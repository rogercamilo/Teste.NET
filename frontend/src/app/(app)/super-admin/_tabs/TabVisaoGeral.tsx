"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign, Building2, Activity, TrendingUp, TrendingDown, Minus, Users, Home, UserSquare,
} from "lucide-react";
import { MrrHistoryChart } from "../_utils";
import type { Metricas } from "../_types";

interface Props {
  metricas: Metricas;
  currFmt: Intl.NumberFormat;
  mrrFmt: string;
}

export function TabVisaoGeral({ metricas, currFmt, mrrFmt }: Props) {
  return (
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
              { label: "Ativas",    count: metricas.orgsAtivas,   color: "bg-emerald-500" },
              { label: "Trial",     count: metricas.orgsTrials,   color: "bg-blue-500" },
              { label: "Suspensas", count: metricas.orgsSuspensas,color: "bg-amber-500" },
              { label: "Canceladas",count: metricas.orgsCanceladas,color:"bg-red-500" },
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
              { label: "Gratuito",     key: "GRATUITO",     color: "bg-slate-400" },
              { label: "Básico",       key: "BASICO",       color: "bg-sky-500" },
              { label: "Intermediário",key: "INTERMEDIARIO",color: "bg-violet-500" },
              { label: "Avançado",     key: "AVANCADO",     color: "bg-amber-500" },
              { label: "Personalizado",key: "PERSONALIZADO",color: "bg-emerald-500" },
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
              { icon: Users,      label: "Formandos",          value: metricas.totalFormandos },
              { icon: Home,       label: "Grupos de Formação", value: metricas.totalGruposFormacao },
              { icon: UserSquare, label: "Usuários",           value: metricas.totalUsuarios },
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

      {metricas.mrrHistory && metricas.mrrHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Evolução do MRR — últimos 6 meses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <MrrHistoryChart data={metricas.mrrHistory} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
