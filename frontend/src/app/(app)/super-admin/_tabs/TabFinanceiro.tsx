"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, TrendingDown, Activity, Minus, AlertTriangle, Building2, Users, Gift } from "lucide-react";
import { MRR_PRICE, PLANO_COLORS } from "../_utils";
import { MrrHistoryChart } from "../_utils";
import type { Metricas } from "../_types";

interface Props {
  metricas: Metricas;
  currFmt: Intl.NumberFormat;
  mrrFmt: string;
  mrrRealFmt: string | null;
}

export function TabFinanceiro({ metricas, currFmt, mrrFmt, mrrRealFmt }: Props) {
  return (
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
                { label: "Gratuito",     key: "GRATUITO",     color: "bg-slate-100 text-slate-600" },
                { label: "Básico",       key: "BASICO",       color: "bg-sky-100 text-sky-700" },
                { label: "Intermediário",key: "INTERMEDIARIO",color: "bg-violet-100 text-violet-700" },
                { label: "Avançado",     key: "AVANCADO",     color: "bg-amber-100 text-amber-700" },
                { label: "Personalizado",key: "PERSONALIZADO",color: "bg-emerald-100 text-emerald-700" },
              ].map(({ label, key, color }) => {
                const count = metricas.planoBreakdown[key] ?? 0;
                const price = MRR_PRICE[key] ?? 0;
                const total = count * price;
                const fmt2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{count}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{fmt2.format(price)}</TableCell>
                    <TableCell className="text-right font-bold">{fmt2.format(total)}</TableCell>
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
              { label: "Ativas",    count: metricas.orgsAtivas,   color: "bg-emerald-500" },
              { label: "Em Trial",  count: metricas.orgsTrials,   color: "bg-blue-500" },
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
            <CardTitle className="text-sm font-medium">Usuários da plataforma</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {[
              { icon: Users,    label: "Formandos",value: metricas.totalFormandos },
              { icon: Building2,label: "Grupos",  value: metricas.totalGruposFormacao },
              { icon: Users,    label: "Usuários", value: metricas.totalUsuarios },
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
              <span className="font-semibold text-foreground">— (consulte aba Cortesias)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
