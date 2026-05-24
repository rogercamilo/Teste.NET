"use client";

import { useState } from "react";
import { mockAgendamentos } from "@/lib/mock-data";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  STATUS_FORMACAO_LABELS,
  type StatusFormacao,
  type Agendamento,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Users,
  XCircle,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  getDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_STYLES: Record<StatusFormacao, string> = {
  agendada: "bg-blue-100 text-blue-700 border-blue-200",
  confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  realizada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-red-100 text-red-600 border-red-200",
  reagendada: "bg-amber-100 text-amber-700 border-amber-200",
};

const STATUS_DOT: Record<StatusFormacao, string> = {
  agendada: "bg-blue-500",
  confirmada: "bg-emerald-500",
  realizada: "bg-slate-400",
  cancelada: "bg-red-400",
  reagendada: "bg-amber-500",
};

const PAGE_SIZE = 10;

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 4, 1));
  const [calView, setCalView] = useState<"month" | "list">("month");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [page, setPage] = useState(1);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPad = getDay(monthStart);
  const paddingDays = Array.from({ length: startPad });

  const filtered = mockAgendamentos.filter((a) =>
    statusFilter === "todos" ? true : a.status === statusFilter
  );

  const monthAgendamentos = mockAgendamentos.filter((a) => {
    const d = parseISO(a.dataInicio);
    return isSameMonth(d, currentMonth);
  });

  const getAgendamentosForDay = (day: Date) =>
    monthAgendamentos.filter((a) => isSameDay(parseISO(a.dataInicio), day));

  return (
    <div className="space-y-5 animate-in-fast">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Agendamento e controle de formações
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-1.5" />
            Google Calendar
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Agendar Formação
          </Button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(["todos", "agendada", "confirmada", "realizada", "cancelada"] as const).map((s) => {
          const count = s === "todos" ? mockAgendamentos.length : mockAgendamentos.filter((a) => a.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`p-2.5 rounded-xl text-left transition-all border ${
                statusFilter === s
                  ? "ring-2 ring-primary bg-primary/5 border-primary/30"
                  : "bg-card border-border/60 hover:border-primary/30"
              }`}
            >
              {s !== "todos" && (
                <div className={`h-1.5 w-4 rounded-full mb-1.5 ${STATUS_DOT[s as StatusFormacao]}`} />
              )}
              <p className="text-lg font-bold text-foreground leading-none">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {s === "todos" ? "Total" : STATUS_FORMACAO_LABELS[s as StatusFormacao]}
              </p>
            </button>
          );
        })}
      </div>

      {/* View toggle + month nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-semibold text-foreground min-w-[140px] text-center capitalize">
            {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date(2026, 4, 1))}>
            Hoje
          </Button>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden h-8">
          <button
            onClick={() => setCalView("month")}
            className={`px-3 text-xs transition-colors ${calView === "month" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            Mês
          </button>
          <button
            onClick={() => setCalView("list")}
            className={`px-3 text-xs border-l border-border transition-colors ${calView === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            Lista
          </button>
        </div>
      </div>

      {calView === "month" && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              {days.map((day) => {
                const dayAgs = getAgendamentosForDay(day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square rounded-lg p-1 transition-colors cursor-pointer hover:bg-muted/60 ${
                      today ? "bg-primary/10 ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <span className={`text-xs font-medium block text-center mb-0.5 ${
                      today ? "text-primary" : "text-foreground"
                    }`}>
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {dayAgs.slice(0, 2).map((ag) => (
                        <div
                          key={ag.id}
                          className={`h-1 rounded-full ${STATUS_DOT[ag.status]}`}
                          title={ag.formacaoTema}
                        />
                      ))}
                      {dayAgs.length > 2 && (
                        <span className="text-[9px] text-muted-foreground text-center">
                          +{dayAgs.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formações list */}
      <div className="space-y-3">
        {calView === "list" && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {filtered.length} formação{filtered.length !== 1 ? "ões" : ""}
            </p>
          </div>
        )}
        {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((ag) => (
          <AgendamentoCard key={ag.id} ag={ag} />
        ))}
        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}

function AgendamentoCard({ ag }: { ag: Agendamento }) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Date block */}
          <div className="flex flex-col items-center justify-center h-12 w-12 rounded-xl bg-muted shrink-0 text-center">
            <span className="text-xs font-medium text-muted-foreground leading-none uppercase">
              {format(parseISO(ag.dataInicio), "MMM", { locale: ptBR })}
            </span>
            <span className="text-lg font-bold text-foreground leading-tight">
              {format(parseISO(ag.dataInicio), "d")}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                  {ag.formacaoTema}
                </h3>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Badge variant="outline" className={`text-xs ${NIVEL_CORES[ag.nivelFormativo]}`}>
                    {NIVEL_FORMATIVO_LABELS[ag.nivelFormativo]}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${STATUS_STYLES[ag.status]}`}>
                    {STATUS_FORMACAO_LABELS[ag.status]}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {ag.status === "agendada" && (
                  <>
                    <Button variant="outline" size="sm" className="h-7 text-xs">Confirmar</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">Cancelar</Button>
                  </>
                )}
                {ag.status === "confirmada" && (
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Concluir
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(ag.dataInicio), "HH:mm")} — {format(parseISO(ag.dataFim), "HH:mm")}
              </span>
              {ag.local && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {ag.local}
                </span>
              )}
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {ag.formadorNome}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {ag.participantes} participantes
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
