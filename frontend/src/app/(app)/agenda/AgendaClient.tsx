"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTermos } from "@/lib/data-store";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  STATUS_FORMACAO_LABELS,
  TIPO_EVENTO_AGENDA_LABELS,
  TIPO_EVENTO_AGENDA_CORES,
  TIPO_COMPROMISSO_LABELS,
  type StatusFormacao,
  type Agendamento,
  type Formacao,
  type GrupoFormacao,
  type Compromisso,
  type TipoEvento,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompromissosTab } from "./CompromissosTab";
import { FormacaoCombobox } from "./FormacaoCombobox";
import {
  BookOpen,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Search,
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
import { AdicionarAoCalendario } from "@/components/AdicionarAoCalendario";

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

// Compromissos pessoais no calendário unificado: cor distinta dos eventos.
const COMPROMISSO_STYLE = "bg-violet-100 text-violet-700 border-violet-200";
const COMPROMISSO_DOT = "bg-violet-500";

/** Item normalizado para a grade unificada (evento ou compromisso pessoal). */
type CalItem = {
  id: string;
  title: string;
  dataInicio: string;
  kind: "agendamento" | "compromisso";
  status?: StatusFormacao;
  subtitle?: string;
};

const PAGE_SIZE = 10;
const JSON_HEADERS = { "Content-Type": "application/json" };
const STATUS_LIST = ["todos", "agendada", "confirmada", "realizada", "cancelada"] as const;

type AlvoAcompanhamento = { tipo: "formando" | "usuario"; id: string; nome: string };

type FormState = {
  tipoEvento: TipoEvento;
  formacaoId: string;
  titulo: string;
  acompanhadoId: string;
  dataInicio: string;
  dataFim: string;
  local: string;
  observacoes: string;
  grupoFormacaoIds: string[];
};

const EMPTY_FORM: FormState = {
  tipoEvento: "formacao",
  formacaoId: "",
  titulo: "",
  acompanhadoId: "",
  dataInicio: "",
  dataFim: "",
  local: "",
  observacoes: "",
  grupoFormacaoIds: [],
};

interface AgendaClientProps {
  initialAgendamentos: Agendamento[];
  initialFormacoes: Formacao[];
  initialGruposFormacao: GrupoFormacao[];
  initialCompromissos: Compromisso[];
  formandosVinculo: { id: string; nome: string }[];
  alvosAcompanhamento: AlvoAcompanhamento[];
  role: string;
  userId: string;
  grupoFormacaoId: string | null;
}

export default function AgendaClient({
  initialAgendamentos,
  initialFormacoes,
  initialGruposFormacao,
  initialCompromissos,
  formandosVinculo,
  alvosAcompanhamento,
  role,
  userId,
  grupoFormacaoId: userGrupoFormacaoId,
}: AgendaClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isFC = role === "formador_comunitario";
  const isFG = role === "formador_geral";

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState("formacoes");
  const [calView, setCalView] = useState<"month" | "list">("month");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [page, setPage] = useState(1);
  const [novoOpen, setNovoOpen] = useState(false);
  // Data pré-selecionada ao abrir o diálogo (clique num dia do calendário).
  // `novoSeq` remonta o form a cada abertura para reaplicar o estado inicial
  // (evita setState em efeito — regra do React Compiler).
  const [novoData, setNovoData] = useState<string | null>(null);
  const [novoSeq, setNovoSeq] = useState(0);
  const abrirNovo = (data?: string) => {
    setNovoData(data ?? null);
    setNovoSeq((s) => s + 1);
    setNovoOpen(true);
  };

  const meus = isFC
    ? initialAgendamentos.filter(
        (a) =>
          a.grupoFormacaoId === userGrupoFormacaoId ||
          a.formadorId === userId ||
          // Acompanhamento comunitário em que o FC é o acompanhado (agendado pelo FG):
          // sem grupo e com outro formadorId, mas deve constar na agenda dele.
          a.acompanhadoUsuarioId === userId ||
          (userGrupoFormacaoId ? (a.grupoFormacaoIds?.includes(userGrupoFormacaoId) ?? false) : false)
      )
    : initialAgendamentos;

  const filtered = meus.filter((a) =>
    statusFilter === "todos" ? true : a.status === statusFilter
  );

  const monthAgendamentos = meus.filter((a) => {
    try { return isSameMonth(parseISO(a.dataInicio), currentMonth); }
    catch { return false; }
  });

  // Compromissos pessoais já chegam escopados ao próprio usuário (page.tsx).
  const monthCompromissos = initialCompromissos.filter((c) => {
    try { return isSameMonth(parseISO(c.dataInicio), currentMonth); }
    catch { return false; }
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const paddingDays = Array.from({ length: getDay(monthStart) });

  // Grade unificada: eventos (cor por status) + compromissos pessoais (violeta).
  const getItemsForDay = (day: Date): CalItem[] => {
    const sameDay = (iso: string) => {
      try { return isSameDay(parseISO(iso), day); } catch { return false; }
    };
    const ags: CalItem[] = monthAgendamentos
      .filter((a) => sameDay(a.dataInicio))
      .map((a) => ({
        id: a.id, title: a.formacaoTema, dataInicio: a.dataInicio,
        kind: "agendamento", status: a.status,
        subtitle: TIPO_EVENTO_AGENDA_LABELS[a.tipoEvento ?? "formacao"],
      }));
    const comps: CalItem[] = monthCompromissos
      .filter((c) => sameDay(c.dataInicio))
      .map((c) => ({
        id: c.id, title: c.titulo, dataInicio: c.dataInicio,
        kind: "compromisso", subtitle: TIPO_COMPROMISSO_LABELS[c.tipo],
      }));
    return [...ags, ...comps].sort(
      (x, y) => new Date(x.dataInicio).getTime() - new Date(y.dataInicio).getTime()
    );
  };

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
        <Button size="sm" onClick={() => abrirNovo()}>
          <Plus className="h-4 w-4 mr-1.5" />
          Agendar evento
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="bg-muted/50 h-9 min-w-max">
            <TabsTrigger value="formacoes" className="text-xs h-7 gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Formações
            </TabsTrigger>
            <TabsTrigger value="compromissos" className="text-xs h-7 gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" /> Meus compromissos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="formacoes" className="space-y-5 mt-4">
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
            <>
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
                      const dayItems = getItemsForDay(day);
                      const today = isToday(day);
                      return (
                        <div
                          key={day.toISOString()}
                          role="button"
                          tabIndex={0}
                          title="Agendar evento neste dia"
                          onClick={() => abrirNovo(`${format(day, "yyyy-MM-dd")}T19:00`)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              abrirNovo(`${format(day, "yyyy-MM-dd")}T19:00`);
                            }
                          }}
                          className={`min-h-[88px] rounded-lg p-1.5 flex flex-col gap-1 transition-colors cursor-pointer hover:bg-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${today ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
                        >
                          <span className={`text-xs font-medium block ${today ? "text-primary" : "text-foreground"}`}>
                            {format(day, "d")}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            {dayItems.slice(0, 3).map((it) => (
                              <button
                                key={`${it.kind}-${it.id}`}
                                type="button"
                                title={`${format(parseISO(it.dataInicio), "HH:mm")} — ${it.title}${it.subtitle ? ` (${it.subtitle})` : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (it.kind === "compromisso") setActiveTab("compromissos");
                                  else setCalView("list");
                                }}
                                className={`w-full text-left text-[10px] leading-tight rounded border px-1 py-0.5 truncate hover:opacity-80 ${it.kind === "compromisso" ? COMPROMISSO_STYLE : STATUS_STYLES[it.status ?? "agendada"]}`}
                              >
                                {it.title}
                              </button>
                            ))}
                            {dayItems.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{dayItems.length - 3} mais</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                {(["agendada", "confirmada", "realizada", "cancelada"] as StatusFormacao[]).map((s) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                    {STATUS_FORMACAO_LABELS[s]}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${COMPROMISSO_DOT}`} />
                  Compromisso pessoal
                </span>
              </div>
            </>
          )}

          {calView === "list" && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {filteredSorted.length} formação{filteredSorted.length !== 1 ? "ões" : ""}
              </p>
              {filteredSorted.length === 0 ? (
                meus.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="Nenhum evento agendado"
                    description="Agende o primeiro evento (formação, retiro, convocação…) — os participantes recebem lembretes automáticos e podem adicioná-lo ao calendário pessoal."
                    action={
                      <Button size="sm" onClick={() => abrirNovo()}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Agendar evento
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={Search}
                    title="Nenhum resultado"
                    description="Nenhum evento corresponde ao filtro de status atual."
                    secondaryAction={
                      <Button size="sm" variant="outline" onClick={() => setStatusFilter("todos")}>
                        Limpar filtro
                      </Button>
                    }
                  />
                )
              ) : (
                <>
                  {filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((ag) => (
                    <AgendamentoCard key={ag.id} ag={ag} canEdit onStatusChange={handleStatusChange} />
                  ))}
                  <Pagination total={filteredSorted.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
                </>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compromissos" className="mt-4">
          <CompromissosTab initialCompromissos={initialCompromissos} formandosVinculo={formandosVinculo} />
        </TabsContent>
      </Tabs>

      <AgendamentoFormDialog
        key={novoSeq}
        open={novoOpen}
        initialDataInicio={novoData ?? undefined}
        onClose={() => setNovoOpen(false)}
        formacoes={initialFormacoes}
        gruposFormacao={initialGruposFormacao}
        alvosAcompanhamento={alvosAcompanhamento}
        userId={userId}
        userGrupoFormacaoId={userGrupoFormacaoId}
        isFC={isFC}
        isFG={isFG}
        podeEventoOrgWide={isFG || role === "administrador"}
        onSaved={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}

function AgendamentoFormDialog({
  open,
  onClose,
  initialDataInicio,
  formacoes,
  gruposFormacao,
  alvosAcompanhamento,
  userId,
  userGrupoFormacaoId,
  isFC,
  isFG,
  podeEventoOrgWide,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initialDataInicio?: string;
  formacoes: Formacao[];
  gruposFormacao: GrupoFormacao[];
  alvosAcompanhamento: AlvoAcompanhamento[];
  userId: string;
  userGrupoFormacaoId: string | null;
  isFC: boolean;
  isFG: boolean;
  /** FG/Admin: podem agendar eventos org-wide (Convocação/Assembleia Geral). */
  podeEventoOrgWide: boolean;
  onSaved: () => void;
}) {
  // Só FC e Formador Geral agendam Acompanhamento Comunitário.
  const podeAcompanhar = isFC || isFG;
  // FC acompanha formandos; FG acompanha formadores.
  const rotuloAlvo = isFC ? "Formando" : "Formador";
  const { grupoFormacao: termoGrupoFormacao } = useTermos();
  const [form, setForm] = useState<FormState>(() => ({ ...EMPTY_FORM, dataInicio: initialDataInicio ?? "" }));
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleGrupo = (id: string) =>
    setForm((prev) => ({
      ...prev,
      grupoFormacaoIds: prev.grupoFormacaoIds.includes(id)
        ? prev.grupoFormacaoIds.filter((g) => g !== id)
        : [...prev.grupoFormacaoIds, id],
    }));

  async function handleSave() {
    const isFormacao = form.tipoEvento === "formacao";
    const isAcomp = form.tipoEvento === "acompanhamento_comunitario";
    if (isFormacao && !form.formacaoId) return toast.error("Selecione a formação.");
    if (isAcomp && !form.acompanhadoId) return toast.error(`Selecione o ${rotuloAlvo.toLowerCase()} a acompanhar.`);
    if (isAcomp && !form.local.trim()) return toast.error("Informe o local do encontro.");
    if (!isFormacao && !isAcomp && !form.titulo.trim()) return toast.error("Informe o título do evento.");
    if (!form.dataInicio) return toast.error("Informe a data e hora de início.");
    setSaving(true);
    try {
      const dataInicioISO = new Date(form.dataInicio).toISOString();
      const dataFimISO = form.dataFim ? new Date(form.dataFim).toISOString() : dataInicioISO;

      // Acompanhamento Comunitário (1:1): payload enxuto — o servidor resolve
      // rótulo, nível e formador. O alvo vira formando OU usuário conforme o papel.
      if (isAcomp) {
        const alvo = alvosAcompanhamento.find((a) => a.id === form.acompanhadoId);
        const payloadAcomp = {
          tipoEvento: form.tipoEvento,
          acompanhadoFormandoId: alvo?.tipo === "formando" ? alvo.id : undefined,
          acompanhadoUsuarioId: alvo?.tipo === "usuario" ? alvo.id : undefined,
          dataInicio: dataInicioISO,
          dataFim: dataFimISO,
          local: form.local.trim(),
          observacoes: form.observacoes.trim() || undefined,
          status: "agendada",
        };
        const resAcomp = await fetch("/api/agendamentos", {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(payloadAcomp),
        });
        if (!resAcomp.ok) {
          const err = await resAcomp.json().catch(() => ({}));
          return toast.error((err as { error?: string }).error ?? "Erro ao agendar acompanhamento.");
        }
        toast.success("Acompanhamento comunitário agendado!");
        setForm(EMPTY_FORM);
        onClose();
        onSaved();
        return;
      }

      const formacao = isFormacao ? formacoes.find((f) => f.id === form.formacaoId) : undefined;
      const grupoFormacaoIdsFinal = isFC
        ? (userGrupoFormacaoId ? [userGrupoFormacaoId] : [])
        : form.grupoFormacaoIds;

      const payload = {
        tipoEvento: form.tipoEvento,
        formacaoId: isFormacao ? form.formacaoId : undefined,
        formacaoTema: isFormacao ? (formacao?.tema ?? "") : form.titulo.trim(),
        nivelFormativo: formacao?.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: formacao?.tipoFormacao ?? "comunitaria",
        formadorId: userId,
        grupoFormacaoIds: grupoFormacaoIdsFinal,
        dataInicio: dataInicioISO,
        dataFim: dataFimISO,
        local: form.local.trim() || undefined,
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
        return toast.error((err as { error?: string }).error ?? "Erro ao agendar evento.");
      }
      toast.success("Evento agendado!");
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
          <DialogTitle>Agendar evento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Tipo de evento</Label>
            <Select value={form.tipoEvento} onValueChange={(v) => v && set("tipoEvento")(v as TipoEvento)}>
              <SelectTrigger className="w-full">
                <SelectValue>{TIPO_EVENTO_AGENDA_LABELS[form.tipoEvento]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formacao">{TIPO_EVENTO_AGENDA_LABELS.formacao}</SelectItem>
                {(isFC || isFG) && (
                  <SelectItem value="formacao_complementar">
                    {TIPO_EVENTO_AGENDA_LABELS.formacao_complementar}
                  </SelectItem>
                )}
                <SelectItem value="retiro">{TIPO_EVENTO_AGENDA_LABELS.retiro}</SelectItem>
                {podeAcompanhar && (
                  <SelectItem value="acompanhamento_comunitario">
                    {TIPO_EVENTO_AGENDA_LABELS.acompanhamento_comunitario}
                  </SelectItem>
                )}
                {podeEventoOrgWide && (
                  <>
                    <SelectItem value="convocacao">{TIPO_EVENTO_AGENDA_LABELS.convocacao}</SelectItem>
                    <SelectItem value="reuniao">{TIPO_EVENTO_AGENDA_LABELS.reuniao}</SelectItem>
                  </>
                )}
                <SelectItem value="outro">{TIPO_EVENTO_AGENDA_LABELS.outro}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.tipoEvento === "formacao" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="formacao-combobox">Formação <span className="text-destructive">*</span></Label>
              <FormacaoCombobox
                id="formacao-combobox"
                formacoes={formacoes}
                value={form.formacaoId}
                onChange={(v) => set("formacaoId")(v)}
              />
            </div>
          ) : form.tipoEvento === "acompanhamento_comunitario" ? (
            <div className="grid gap-1.5">
              <Label>{rotuloAlvo} <span className="text-destructive">*</span></Label>
              {alvosAcompanhamento.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-md border border-dashed border-border px-3 py-2">
                  {isFC
                    ? "Nenhum formando no seu grupo para acompanhar."
                    : "Nenhum formador comunitário ou pedagógico cadastrado."}
                </p>
              ) : (
                <Select value={form.acompanhadoId} onValueChange={(v) => v && set("acompanhadoId")(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Selecionar ${rotuloAlvo.toLowerCase()}...`}>
                      {alvosAcompanhamento.find((a) => a.id === form.acompanhadoId)?.nome}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {alvosAcompanhamento.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Encontro de partilha e oração — no máximo um por mês para cada pessoa.
              </p>
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label>Título <span className="text-destructive">*</span></Label>
              <Input
                value={form.titulo}
                onChange={(e) => set("titulo")(e.target.value)}
                placeholder={
                  form.tipoEvento === "retiro"
                    ? "Ex.: Retiro de Advento"
                    : form.tipoEvento === "formacao_complementar"
                      ? "Ex.: Palestra sobre São José"
                      : form.tipoEvento === "convocacao"
                        ? "Ex.: Convocação Geral da Comunidade"
                        : form.tipoEvento === "reuniao"
                          ? "Ex.: Assembleia de formadores"
                          : "Nome do evento"
                }
              />
            </div>
          )}
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
          <div className="grid gap-1.5">
            <Label>
              Local
              {form.tipoEvento === "acompanhamento_comunitario" && <span className="text-destructive"> *</span>}
            </Label>
            <Input value={form.local} onChange={(e) => set("local")(e.target.value)} placeholder="Salão, online, endereço..." />
          </div>
          {!isFC && form.tipoEvento !== "acompanhamento_comunitario" && gruposFormacao.length > 0 && (
            <div className="grid gap-1.5">
              <Label>
                {termoGrupoFormacao}s{" "}
                <span className="font-normal text-xs text-muted-foreground">(vazio = todos)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {gruposFormacao.map((m) => {
                  const selected = form.grupoFormacaoIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleGrupo(m.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {m.nome}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {form.grupoFormacaoIds.length === 0
                  ? "Todos os grupos da organização serão notificados."
                  : `${form.grupoFormacaoIds.length} ${termoGrupoFormacao.toLowerCase()}(s) selecionado(s).`}
              </p>
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
                  {ag.tipoEvento && ag.tipoEvento !== "formacao" ? (
                    <Badge variant="outline" className={`text-xs ${TIPO_EVENTO_AGENDA_CORES[ag.tipoEvento]}`}>
                      {TIPO_EVENTO_AGENDA_LABELS[ag.tipoEvento]}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={`text-xs ${NIVEL_CORES[ag.nivelFormativo]}`}>
                      {NIVEL_FORMATIVO_LABELS[ag.nivelFormativo]}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-xs ${STATUS_STYLES[ag.status]}`}>
                    {STATUS_FORMACAO_LABELS[ag.status]}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0 items-center">
                <AdicionarAoCalendario
                  compact
                  className="h-7"
                  event={{
                    id: ag.id,
                    title: ag.formacaoTema,
                    start: ag.dataInicio,
                    end: ag.dataFim,
                    description:
                      [ag.observacoes, ag.linkOnline ? `Online: ${ag.linkOnline}` : null]
                        .filter(Boolean)
                        .join("\n") || undefined,
                    location: ag.local ?? ag.linkOnline ?? undefined,
                  }}
                />
                {canEdit && ag.status === "agendada" && (
                  <>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onStatusChange(ag.id, "confirmada")}>
                      Confirmar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onStatusChange(ag.id, "cancelada")}>
                      Cancelar
                    </Button>
                  </>
                )}
                {canEdit && ag.status === "confirmada" && (
                  <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onStatusChange(ag.id, "realizada")}>
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
              {ag.local && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{ag.local}</span>}
              <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{ag.formadorNome}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
