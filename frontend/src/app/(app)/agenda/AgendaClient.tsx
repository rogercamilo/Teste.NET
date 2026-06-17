"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTermos } from "@/lib/data-store";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  STATUS_FORMACAO_LABELS,
  type StatusFormacao,
  type Agendamento,
  type NivelFormativo,
  type Formacao,
  type GrupoFormacao,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
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
import { toast } from "sonner";

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
const JSON_HEADERS = { "Content-Type": "application/json" };
const STATUS_LIST = ["todos", "agendada", "confirmada", "realizada", "cancelada"] as const;

type FormState = {
  formacaoId: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  participantes: string;
  observacoes: string;
  grupoFormacaoId: string;
};

const EMPTY_FORM: FormState = {
  formacaoId: "",
  dataInicio: "",
  dataFim: "",
  local: "",
  participantes: "",
  observacoes: "",
  grupoFormacaoId: "",
};

interface AgendaClientProps {
  initialAgendamentos: Agendamento[];
  initialFormacoes: Formacao[];
  initialGruposFormacao: GrupoFormacao[];
  role: string;
  userId: string;
  grupoFormacaoId: string | null;
}

export default function AgendaClient({
  initialAgendamentos,
  initialFormacoes,
  initialGruposFormacao,
  role,
  userId,
  grupoFormacaoId: userGrupoFormacaoId,
}: AgendaClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isFC = role === "formador_comunitario";

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calView, setCalView] = useState<"month" | "list">("month");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [novoOpen, setNovoOpen] = useState(false);

  const meus = isFC
    ? initialAgendamentos.filter((a) => a.grupoFormacaoId === userGrupoFormacaoId || a.formadorId === userId)
    : initialAgendamentos;

  const filtered = meus.filter((a) =>
    statusFilter === "todos" ? true : a.status === statusFilter
  );

  const monthAgendamentos = meus.filter((a) => {
    try { return isSameMonth(parseISO(a.dataInicio), currentMonth); }
    catch { return false; }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const paddingDays = Array.from({ length: getDay(monthStart) });

  const getAgendamentosForDay = (day: Date) =>
    monthAgendamentos.filter((a) => {
      try { return isSameDay(parseISO(a.dataInicio), day); }
      catch { return false; }
    });

  async function handleStatusChange(id: string, newStatus: StatusFormacao) {
    try {
      const res = await fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) return toast.error("Erro ao atualizar status.");
      toast.success(
        newStatus === "confirmada" ? "Formação confirmada."
        : newStatus === "realizada" ? "Formação concluída."
        : "Formação cancelada."
      );
      startTransition(() => router.refresh());
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    }
  }

  const filteredSorted = [...filtered].sort(
    (a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime()
  );

  return (
    <div className="space-y-5 animate-in-fast">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Agendamento e controle de formações</p>
        </div>
        <Button size="sm" onClick={() => setNovoOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Agendar Formação
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STATUS_LIST.map((s) => {
          const count = s === "todos" ? meus.length : meus.filter((a) => a.status === s).length;
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
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
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCurrentMonth(new Date())}>
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
            <div className="grid grid-cols-7 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}
              {days.map((day) => {
                const dayAgs = getAgendamentosForDay(day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square rounded-lg p-1 transition-colors cursor-pointer hover:bg-muted/60 ${today ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                  >
                    <span className={`text-xs font-medium block text-center mb-0.5 ${today ? "text-primary" : "text-foreground"}`}>
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {dayAgs.slice(0, 2).map((ag) => (
                        <div key={ag.id} className={`h-1 rounded-full ${STATUS_DOT[ag.status]}`} title={ag.formacaoTema} />
                      ))}
                      {dayAgs.length > 2 && (
                        <span className="text-[9px] text-muted-foreground text-center">+{dayAgs.length - 2}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {calView === "list" && (
          <p className="text-sm font-medium text-foreground">
            {filteredSorted.length} formação{filteredSorted.length !== 1 ? "ões" : ""}
          </p>
        )}
        {filteredSorted.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhuma formação encontrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter !== "todos" ? "Tente outro filtro de status." : "Clique em Agendar Formação para adicionar."}
            </p>
          </div>
        ) : (
          <>
            {filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((ag) => (
              <AgendamentoCard key={ag.id} ag={ag} canEdit onStatusChange={handleStatusChange} />
            ))}
            <Pagination total={filteredSorted.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </>
        )}
      </div>

      <AgendamentoFormDialog
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        formacoes={initialFormacoes}
        gruposFormacao={initialGruposFormacao}
        userId={userId}
        userGrupoFormacaoId={userGrupoFormacaoId}
        isFC={isFC}
        onSaved={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}

function AgendamentoFormDialog({
  open,
  onClose,
  formacoes,
  gruposFormacao,
  userId,
  userGrupoFormacaoId,
  isFC,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  formacoes: Formacao[];
  gruposFormacao: GrupoFormacao[];
  userId: string;
  userGrupoFormacaoId: string | null;
  isFC: boolean;
  onSaved: () => void;
}) {
  const { grupoFormacao: termoGrupoFormacao } = useTermos();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSave() {
    if (!form.formacaoId) return toast.error("Selecione a formação.");
    if (!form.dataInicio) return toast.error("Informe a data e hora de início.");
    setSaving(true);
    try {
      const formacao = formacoes.find((f) => f.id === form.formacaoId);
      const dataInicioISO = new Date(form.dataInicio).toISOString();
      const dataFimISO = form.dataFim ? new Date(form.dataFim).toISOString() : dataInicioISO;
      const grupoFormacaoIdFinal = isFC ? (userGrupoFormacaoId ?? undefined) : (form.grupoFormacaoId || undefined);

      const payload = {
        formacaoId: form.formacaoId,
        formacaoTema: formacao?.tema ?? "",
        nivelFormativo: formacao?.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: formacao?.tipoFormacao ?? "comunitaria",
        formadorId: userId,
        grupoFormacaoId: grupoFormacaoIdFinal,
        dataInicio: dataInicioISO,
        dataFim: dataFimISO,
        local: form.local.trim() || undefined,
        participantes: Number(form.participantes) || 0,
        observacoes: form.observacoes.trim() || undefined,
        status: "agendada",
      };

      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return toast.error((err as { error?: string }).error ?? "Erro ao agendar formação.");
      }
      toast.success("Formação agendada!");
      setForm(EMPTY_FORM);
      onClose();
      onSaved();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Formação</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Formação <span className="text-destructive">*</span></Label>
            <Select value={form.formacaoId} onValueChange={(v) => v && set("formacaoId")(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar formação..." />
              </SelectTrigger>
              <SelectContent>
                {formacoes.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span>{f.tema}</span>
                    {f.eixoNome && <span className="ml-2 text-xs text-muted-foreground">({f.eixoNome})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Data e hora de início <span className="text-destructive">*</span></Label>
              <Input type="datetime-local" value={form.dataInicio} onChange={(e) => set("dataInicio")(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Data e hora de fim</Label>
              <Input type="datetime-local" value={form.dataFim} onChange={(e) => set("dataFim")(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Local</Label>
              <Input value={form.local} onChange={(e) => set("local")(e.target.value)} placeholder="Salão, online, endereço..." />
            </div>
            <div className="grid gap-1.5">
              <Label>Participantes esperados</Label>
              <Input type="number" min="0" value={form.participantes} onChange={(e) => set("participantes")(e.target.value)} placeholder="0" />
            </div>
          </div>
          {!isFC && gruposFormacao.length > 0 && (
            <div className="grid gap-1.5">
              <Label>{termoGrupoFormacao}</Label>
              <Select value={form.grupoFormacaoId} onValueChange={(v) => v && set("grupoFormacaoId")(v)}>
                <SelectTrigger>
                  <SelectValue placeholder={`Selecionar ${termoGrupoFormacao.toLowerCase()} (opcional)...`} />
                </SelectTrigger>
                <SelectContent>
                  {gruposFormacao.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <Textarea
              value={form.observacoes}
              onChange={(e) => set("observacoes")(e.target.value)}
              placeholder="Instruções, avisos ou contexto..."
              className="min-h-[60px] resize-none text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Agendando…</> : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgendamentoCard({
  ag,
  canEdit,
  onStatusChange,
}: {
  ag: Agendamento;
  canEdit: boolean;
  onStatusChange: (id: string, status: StatusFormacao) => void;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
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
              {canEdit && (
                <div className="flex gap-1.5 shrink-0">
                  {ag.status === "agendada" && (
                    <>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onStatusChange(ag.id, "confirmada")}>
                        Confirmar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onStatusChange(ag.id, "cancelada")}>
                        Cancelar
                      </Button>
                    </>
                  )}
                  {ag.status === "confirmada" && (
                    <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onStatusChange(ag.id, "realizada")}>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Concluir
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(parseISO(ag.dataInicio), "HH:mm")} — {format(parseISO(ag.dataFim), "HH:mm")}
              </span>
              {ag.local && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ag.local}</span>}
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{ag.formadorNome}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{ag.participantes} participantes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
