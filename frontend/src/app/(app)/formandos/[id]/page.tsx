"use client";

import { use, useState } from "react";
import { useSession } from "next-auth/react";
import {
  db,
  useAgendamentos,
  useHistorico,
  useComentarios,
  useComunidade,
} from "@/lib/data-store";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  MODALIDADE_LABELS,
  TIPO_COMENTARIO_LABELS,
  TIPO_COMENTARIO_CORES,
  STATUS_FORMACAO_LABELS,
  type StatusFormacao,
  type TipoComentario,
  type HistoricoFormando,
  type ComentarioFormando,
  type Agendamento,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  User,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_COLORS: Record<StatusFormacao, string> = {
  agendada: "bg-blue-100 text-blue-700 border-blue-200",
  confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  realizada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-red-100 text-red-600 border-red-200",
  reagendada: "bg-amber-100 text-amber-700 border-amber-200",
};

const ESTADO_CIVIL_LABELS = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

export default function FormandoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [agendamentos] = useAgendamentos();
  const [historico, setHistorico] = useHistorico();
  const [comentarios, setComentarios] = useComentarios();
  const [comunidade] = useComunidade();

  const userId = (session?.user as { id?: string })?.id ?? "u0";
  const userName = session?.user?.name ?? "Formador";

  const termoFormando = comunidade.termoFormando?.trim() || "Formando";
  const termoFormador = comunidade.termoFormador?.trim() || "Formador Comunitário";

  // State — registrar participação em agendamento
  const [registroOpen, setRegistroOpen] = useState(false);
  const [selectedAg, setSelectedAg] = useState<Agendamento | null>(null);
  const [registroForm, setRegistroForm] = useState({ presente: "true", observacao: "" });

  // State — novo comentário
  const [comentarioOpen, setComentarioOpen] = useState(false);
  const [comentarioForm, setComentarioForm] = useState<{ tipo: TipoComentario; texto: string }>({
    tipo: "adesao",
    texto: "",
  });

  const [allFormandos] = useState(() => db.formandos.load());
  const formando = allFormandos.find((f) => f.id === id);

  if (!formando) {
    return (
      <div className="flex flex-col items-center py-20">
        <p className="text-muted-foreground">{termoFormando} não encontrado</p>
        <Link
          href="/formandos"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}
        >
          Voltar
        </Link>
      </div>
    );
  }

  const initials = formando.nome
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const idade = differenceInYears(new Date(), parseISO(formando.dataNascimento));
  const progresso = Math.round(
    (formando.formacoesRealizadas / formando.totalFormacoes) * 100
  );

  // Agendamentos do nível formativo do formando, ordenados do mais recente/próximo
  const formandoAgendamentos = agendamentos
    .filter((ag) => ag.nivelFormativo === formando.nivelFormativo)
    .sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));

  // Histórico de participação deste formando
  const formandoHistorico = historico.filter((h) => h.formandoId === id);

  function getRegistro(agId: string): HistoricoFormando | undefined {
    return formandoHistorico.find((h) => h.agendamentoId === agId);
  }

  // Comentários do formador sobre este formando
  const formandoComentarios = comentarios
    .filter((c) => c.formandoId === id)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  const trilhaEtapas = [
    { nivel: "pre-discipulado" as const, label: "Pré-Discipulado", total: 8, concluidas: 8 },
    {
      nivel: "discipulado" as const,
      label: "Discipulado",
      total: 15,
      concluidas:
        formando.nivelFormativo === "discipulado"
          ? formando.formacoesRealizadas
          : formando.nivelFormativo === "primeiras-promessas" ||
            formando.nivelFormativo === "formacao-permanente"
          ? 15
          : 0,
    },
    {
      nivel: "primeiras-promessas" as const,
      label: "Primeiras Promessas",
      total: 24,
      concluidas:
        formando.nivelFormativo === "primeiras-promessas"
          ? formando.formacoesRealizadas
          : formando.nivelFormativo === "formacao-permanente"
          ? 24
          : 0,
    },
    {
      nivel: "formacao-permanente" as const,
      label: "Formação Permanente",
      total: 48,
      concluidas:
        formando.nivelFormativo === "formacao-permanente"
          ? formando.formacoesRealizadas
          : 0,
    },
  ];

  function openRegistro(ag: Agendamento) {
    setSelectedAg(ag);
    setRegistroForm({ presente: "true", observacao: "" });
    setRegistroOpen(true);
  }

  function handleSaveRegistro() {
    if (!selectedAg) return;
    const novo: HistoricoFormando = {
      id: `h${Date.now()}`,
      formandoId: id,
      agendamentoId: selectedAg.id,
      formacaoTema: selectedAg.formacaoTema,
      data: selectedAg.dataInicio.split("T")[0],
      status: selectedAg.status,
      presente: registroForm.presente === "true",
      observacao: registroForm.observacao.trim() || undefined,
    };
    setHistorico((prev) => [...prev, novo]);
    setRegistroOpen(false);
    toast.success("Participação registrada.");
  }

  function handleSaveComentario() {
    if (!formando) return;
    if (!comentarioForm.texto.trim()) return toast.error("O texto do comentário é obrigatório.");
    const novo: ComentarioFormando = {
      id: `c${Date.now()}`,
      formandoId: id,
      formandoNome: formando.nome,
      formadorId: userId,
      formadorNome: userName,
      texto: comentarioForm.texto.trim(),
      tipo: comentarioForm.tipo,
      criadoEm: new Date().toISOString(),
    };
    setComentarios((prev) => [...prev, novo]);
    setComentarioOpen(false);
    setComentarioForm({ tipo: "adesao", texto: "" });
    toast.success("Comentário salvo.");
  }

  return (
    <div className="space-y-6 animate-in-fast">
      {/* Cabeçalho */}
      <div>
        <Link
          href="/formandos"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-3 -ml-1 text-muted-foreground"
          )}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {termoFormando}s
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback
              className={`text-lg font-bold ${NIVEL_CORES[formando.nivelFormativo]}`}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{formando.nome}</h1>
              <Badge variant="outline" className={NIVEL_CORES[formando.nivelFormativo]}>
                {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
              </Badge>
              <Badge
                variant="outline"
                className={
                  formando.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""
                }
              >
                {formando.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {formando.email}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {formando.telefone}
              </span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm">
              Editar
            </Button>
            <Button size="sm">
              <Calendar className="h-4 w-4 mr-1.5" />
              Agendar
            </Button>
          </div>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{formando.totalFormacoes}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total de formações</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formando.formacoesRealizadas}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Realizadas</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{progresso}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Progresso</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="jornada">
        <TabsList className="bg-muted/50 h-9">
          <TabsTrigger value="jornada" className="text-xs h-7">
            Jornada Formativa
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs h-7">
            Histórico de evolução
          </TabsTrigger>
          <TabsTrigger value="comentarios" className="text-xs h-7">
            Comentários do formador
          </TabsTrigger>
          <TabsTrigger value="dados" className="text-xs h-7">
            Dados Pessoais
          </TabsTrigger>
        </TabsList>

        {/* Jornada Formativa */}
        <TabsContent value="jornada" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-semibold">Trilha Formativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {trilhaEtapas.map((etapa, idx) => {
                const isAtual = etapa.nivel === formando.nivelFormativo;
                const isConcluida = etapa.concluidas === etapa.total;
                const isPendente = etapa.concluidas === 0;
                const pct = Math.round((etapa.concluidas / etapa.total) * 100);

                return (
                  <div key={etapa.nivel} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                          isConcluida
                            ? "bg-emerald-100"
                            : isAtual
                            ? "bg-primary/15 ring-2 ring-primary/30"
                            : "bg-muted"
                        }`}
                      >
                        {isConcluida ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <span
                            className={`text-sm font-bold ${
                              isAtual ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      {idx < trilhaEtapas.length - 1 && (
                        <div
                          className={`flex-1 w-0.5 mt-1 min-h-[20px] ${
                            isConcluida ? "bg-emerald-200" : "bg-border"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              isAtual
                                ? "text-primary"
                                : isConcluida
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {etapa.label}
                          </span>
                          {isAtual && (
                            <Badge className="text-xs h-4 bg-primary/10 text-primary border-0 px-1.5">
                              Atual
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {etapa.concluidas}/{etapa.total}
                        </span>
                      </div>
                      {!isPendente && <Progress value={pct} className="h-1.5" />}
                      {isPendente && <div className="h-1.5 bg-muted rounded-full" />}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico de evolução — baseado em agendamentos reais */}
        <TabsContent value="historico" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div>
                <CardTitle className="text-sm font-semibold">Histórico de evolução</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Formações do nível{" "}
                  <span className="font-medium">
                    {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
                  </span>{" "}
                  · {formandoAgendamentos.length} agendamento
                  {formandoAgendamentos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {formandoAgendamentos.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground text-sm">
                    Nenhuma formação agendada para este nível
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Acesse a seção Formações para criar agendamentos.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formandoAgendamentos.map((ag) => {
                    const registro = getRegistro(ag.id);
                    const isCancelada = ag.status === "cancelada";
                    const dataFormatada = format(
                      parseISO(ag.dataInicio),
                      "d 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    );
                    const horaInicio = format(parseISO(ag.dataInicio), "HH:mm");
                    const horaFim = format(parseISO(ag.dataFim), "HH:mm");

                    return (
                      <div
                        key={ag.id}
                        className={`rounded-xl border p-4 transition-colors ${
                          isCancelada
                            ? "bg-muted/20 border-border/30 opacity-60"
                            : "bg-card border-border/50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Ícone de status */}
                          <div
                            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                              ag.status === "realizada"
                                ? "bg-slate-100"
                                : ag.status === "cancelada"
                                ? "bg-red-50"
                                : "bg-primary/10"
                            }`}
                          >
                            {ag.status === "cancelada" ? (
                              <XCircle className="h-4 w-4 text-red-400" />
                            ) : ag.status === "realizada" ? (
                              <CheckCircle2 className="h-4 w-4 text-slate-500" />
                            ) : (
                              <Calendar className="h-4 w-4 text-primary" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Tema + badges */}
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground leading-tight">
                                  {ag.formacaoTema}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  {dataFormatada} · {horaInicio}–{horaFim}
                                </p>
                                {ag.local && (
                                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    {ag.local}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${STATUS_COLORS[ag.status]}`}
                                >
                                  {STATUS_FORMACAO_LABELS[ag.status]}
                                </Badge>
                                {!registro && !isCancelada && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs"
                                    onClick={() => openRegistro(ag)}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Registrar participação
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Registro de participação */}
                            {registro && (
                              <div className="mt-3 flex items-start gap-2.5 rounded-lg bg-muted/40 p-2.5">
                                <div
                                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                                    registro.presente ? "bg-emerald-100" : "bg-red-100"
                                  }`}
                                >
                                  {registro.presente ? (
                                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <UserX className="h-3.5 w-3.5 text-red-500" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={`text-xs h-5 ${
                                        registro.presente
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-red-50 text-red-600 border-red-200"
                                      }`}
                                    >
                                      {registro.presente ? "Presente" : "Ausente"}
                                    </Badge>
                                  </div>
                                  {registro.observacao && (
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                      {registro.observacao}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comentários do formador */}
        <TabsContent value="comentarios" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Comentários do {termoFormador}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pareceres sobre a adesão ao plano formativo
                </p>
              </div>
              <Button size="sm" onClick={() => setComentarioOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Novo comentário
              </Button>
            </CardHeader>
            <CardContent>
              {formandoComentarios.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground text-sm">Nenhum comentário registrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em "Novo comentário" para registrar seu parecer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formandoComentarios.map((comentario) => (
                    <div
                      key={comentario.id}
                      className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs ${TIPO_COMENTARIO_CORES[comentario.tipo]}`}
                        >
                          {TIPO_COMENTARIO_LABELS[comentario.tipo]}
                        </Badge>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(comentario.criadoEm),
                            "d 'de' MMM 'de' yyyy",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{comentario.texto}</p>
                      {comentario.formadorNome && (
                        <p className="text-xs text-muted-foreground">
                          — {comentario.formadorNome}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dados Pessoais */}
        <TabsContent value="dados" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 space-y-4">
              {[
                { icon: User, label: "Nome completo", value: formando.nome },
                {
                  icon: Calendar,
                  label: "Data de nascimento",
                  value: `${format(parseISO(formando.dataNascimento), "dd/MM/yyyy")} (${idade} anos)`,
                },
                {
                  icon: User,
                  label: "Estado civil",
                  value: ESTADO_CIVIL_LABELS[formando.estadoCivil],
                },
                {
                  icon: MapPin,
                  label: "Modalidade",
                  value: MODALIDADE_LABELS[formando.modalidade],
                },
                {
                  icon: Calendar,
                  label: "Data de ingresso",
                  value: format(parseISO(formando.dataIngresso), "dd/MM/yyyy"),
                },
                { icon: Mail, label: "E-mail", value: formando.email },
                { icon: Phone, label: "Telefone", value: formando.telefone },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Registrar Participação */}
      <Dialog open={registroOpen} onOpenChange={setRegistroOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar participação</DialogTitle>
          </DialogHeader>
          {selectedAg && (
            <div className="grid gap-4 py-2">
              {/* Info do agendamento (somente leitura) */}
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{selectedAg.formacaoTema}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(selectedAg.dataInicio), "d 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}{" "}
                  ·{" "}
                  {format(parseISO(selectedAg.dataInicio), "HH:mm")}–
                  {format(parseISO(selectedAg.dataFim), "HH:mm")}
                </p>
                {selectedAg.local && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {selectedAg.local}
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label>Presença</Label>
                <Select
                  value={registroForm.presente}
                  onValueChange={(v) =>
                    v && setRegistroForm((prev) => ({ ...prev, presente: v }))
                  }
                  items={{ true: "Presente", false: "Ausente" }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Presente</SelectItem>
                    <SelectItem value="false">Ausente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>Observação sobre a participação neste encontro</Label>
                <Textarea
                  placeholder="Descreva como foi a adesão e participação do formando neste dia..."
                  value={registroForm.observacao}
                  onChange={(e) =>
                    setRegistroForm((prev) => ({ ...prev, observacao: e.target.value }))
                  }
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRegistroOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRegistro}>Salvar registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Comentário */}
      <Dialog open={comentarioOpen} onOpenChange={setComentarioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo comentário do {termoFormador}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Tipo de comentário</Label>
              <Select
                value={comentarioForm.tipo}
                onValueChange={(v) =>
                  v &&
                  setComentarioForm((prev) => ({ ...prev, tipo: v as TipoComentario }))
                }
                items={TIPO_COMENTARIO_LABELS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adesao">Adesão</SelectItem>
                  <SelectItem value="progresso">Progresso</SelectItem>
                  <SelectItem value="dificuldade">Dificuldade</SelectItem>
                  <SelectItem value="observacao">Observação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>
                Comentário <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Descreva suas percepções sobre a adesão do formando ao plano formativo..."
                value={comentarioForm.texto}
                onChange={(e) =>
                  setComentarioForm((prev) => ({ ...prev, texto: e.target.value }))
                }
                rows={5}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComentarioOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveComentario}>Salvar comentário</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
