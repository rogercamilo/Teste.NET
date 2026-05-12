"use client";

import { useState } from "react";
import {
  mockAgendamentos,
} from "@/lib/mock-data";
import { usePresencas, useComentarios, db } from "@/lib/data-store";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  MODALIDADE_LABELS,
  STATUS_FORMACAO_LABELS,
  TIPO_COMENTARIO_CORES,
  TIPO_COMENTARIO_LABELS,
  type Morada,
  type PresencaFormacao,
  type ComentarioFormando,
  type TipoComentario,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  CheckCircle2,
  ClipboardList,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Save,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface MoradaDetailProps {
  id: string;
  userRole: string;
  userId: string;
}

const NIVEL_ICONS: Record<string, string> = {
  "pre-discipulado": "🌱",
  discipulado: "📖",
  "primeiras-promessas": "🌟",
  "formacao-permanente": "🔥",
};

const STATUS_FORMACAO_COLORS: Record<string, string> = {
  agendada: "bg-blue-100 text-blue-700 border-blue-200",
  confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  realizada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-red-100 text-red-600 border-red-200",
  reagendada: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function MoradaDetail({ id, userRole, userId }: MoradaDetailProps) {
  const isAdmin = userRole === "administrador";

  const [morada, setMorada] = useState<Morada | undefined>(() =>
    db.moradas.load().find((m) => m.id === id)
  );
  const [allFormandos] = useState(() => db.formandos.load());
  const [allPlanos] = useState(() => db.planos.load());
  const [allGrades] = useState(() => db.grades.load());

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", endereco: "" });

  const [agendamentoId, setAgendamentoId] = useState<string>("");
  const [presencas, setPresencas] = usePresencas();

  const [comentarios, setComentarios] = useComentarios();
  const [comentarioOpen, setComentarioOpen] = useState(false);
  const [novoFormandoId, setNovoFormandoId] = useState("");
  const [novoTipo, setNovoTipo] = useState<TipoComentario>("observacao");
  const [novoTexto, setNovoTexto] = useState("");

  if (!morada) {
    return (
      <div className="flex flex-col items-center py-20">
        <p className="text-muted-foreground">Morada não encontrada.</p>
        <Link href="/moradas" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
          Voltar
        </Link>
      </div>
    );
  }

  const formador = db.usuarios.load().find((u) => u.id === morada.formadorId);
  const plano = allPlanos.find((p) => p.id === morada.planoId);
  const grade = allGrades.find((g) => g.id === morada.gradeId);
  const formandosDaMorada = allFormandos.filter((f) => f.moradaId === morada.id);
  const agendamentosDaMorada = mockAgendamentos.filter(
    (a) => a.formadorId === morada.formadorId || a.nivelFormativo === morada.nivelFormativo
  );
  const realizadas = agendamentosDaMorada.filter(
    (a) => a.status === "realizada" || a.status === "confirmada"
  );
  const comentariosDaMorada = comentarios.filter((c) =>
    formandosDaMorada.some((f) => f.id === c.formandoId)
  );

  const agendamento = agendamentosDaMorada.find((a) => a.id === agendamentoId);

  function getPresenca(formandoId: string): boolean {
    return (
      presencas.find((p) => p.agendamentoId === agendamentoId && p.formandoId === formandoId)
        ?.presente ?? false
    );
  }

  function togglePresenca(formandoId: string, formandoNome: string) {
    setPresencas((prev) => {
      const existente = prev.find(
        (p) => p.agendamentoId === agendamentoId && p.formandoId === formandoId
      );
      if (existente) {
        return prev.map((p) =>
          p.agendamentoId === agendamentoId && p.formandoId === formandoId
            ? { ...p, presente: !p.presente }
            : p
        );
      }
      const formando = allFormandos.find((f) => f.id === formandoId);
      return [
        ...prev,
        {
          id: `pr-${Date.now()}`,
          agendamentoId,
          formacaoTema: agendamento?.formacaoTema ?? "",
          data: agendamento?.dataInicio.split("T")[0] ?? "",
          formandoId,
          formandoNome,
          nivelFormativo: formando?.nivelFormativo ?? "pre-discipulado",
          presente: true,
        },
      ];
    });
  }

  function calcPresencaFormando(formandoId: string) {
    const total = realizadas.length;
    const presentes = realizadas.filter((ag) =>
      presencas.find((p) => p.agendamentoId === ag.id && p.formandoId === formandoId && p.presente)
    ).length;
    return { total, presentes, pct: total > 0 ? Math.round((presentes / total) * 100) : 0 };
  }

  function openEdit() {
    if (!morada) return;
    setEditForm({ nome: morada.nome, endereco: morada.endereco ?? "" });
    setEditOpen(true);
  }

  function handleEditSave() {
    if (!editForm.nome.trim()) return toast.error("Nome é obrigatório.");
    setMorada((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, nome: editForm.nome.trim(), endereco: editForm.endereco.trim() || undefined };
      const all = db.moradas.load().map((m) => (m.id === updated.id ? updated : m));
      db.moradas.save(all);
      return updated;
    });
    setEditOpen(false);
    toast.success("Morada atualizada!");
  }

  function handleSalvarPresenca() {
    toast.success("Lista de presença salva com sucesso!");
  }

  function handleSalvarComentario() {
    if (!morada) return;
    if (!novoFormandoId || !novoTexto.trim()) return;
    const formando = allFormandos.find((f) => f.id === novoFormandoId);
    if (!formando) return;
    setComentarios((prev) => [
      {
        id: `c-${Date.now()}`,
        formandoId: novoFormandoId,
        formandoNome: formando.nome,
        formadorId: morada.formadorId,
        texto: novoTexto.trim(),
        tipo: novoTipo,
        criadoEm: new Date().toISOString().split("T")[0],
      },
      ...prev,
    ]);
    setComentarioOpen(false);
    setNovoFormandoId("");
    setNovoTexto("");
    setNovoTipo("observacao");
    toast.success("Comentário registrado com sucesso!");
  }

  const presentes = formandosDaMorada.filter((f) => getPresenca(f.id)).length;
  const ausentes = formandosDaMorada.length - presentes;

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/moradas"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-3 -ml-1 text-muted-foreground")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Moradas
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-2xl">
            {NIVEL_ICONS[morada.nivelFormativo] ?? "🏠"}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{morada.nome}</h1>
              <Badge variant="outline" className={NIVEL_CORES[morada.nivelFormativo]}>
                {NIVEL_FORMATIVO_LABELS[morada.nivelFormativo]}
              </Badge>
              <Badge
                variant="outline"
                className={morada.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}
              >
                {morada.ativo ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            {morada.endereco && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {morada.endereco}
              </p>
            )}
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openEdit} className="shrink-0">
              <Pencil className="h-4 w-4 mr-1.5" />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{formandosDaMorada.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Formandos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{agendamentosDaMorada.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Agendamentos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{realizadas.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Realizadas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="resumo">
        <TabsList className="bg-muted/50 h-9">
          <TabsTrigger value="resumo" className="text-xs h-7 gap-1.5">
            <Home className="h-3.5 w-3.5" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="formandos" className="text-xs h-7 gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Formandos
          </TabsTrigger>
          <TabsTrigger value="presenca" className="text-xs h-7 gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" />
            Presença
          </TabsTrigger>
          <TabsTrigger value="comentarios" className="text-xs h-7 gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Comentários
          </TabsTrigger>
        </TabsList>

        {/* TAB RESUMO */}
        <TabsContent value="resumo" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Formador Responsável</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formador ? (
                  <>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                          {formador.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{formador.nome}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {formador.email}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Formador não encontrado</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Plano & Grade Formativos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {plano ? (
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{plano.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(plano.vigenciaInicio), "dd/MM/yyyy")} —{" "}
                        {format(parseISO(plano.vigenciaFim), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum plano vinculado</p>
                )}
                {grade ? (
                  <div className="flex items-start gap-2 mt-2">
                    <BookOpen className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-foreground">{grade.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        v{grade.versao} · {grade.eixos.length} eixos · {grade.totalFormacoes} formações
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">Nenhuma grade vinculada</p>
                )}
              </CardContent>
            </Card>
          </div>

          {grade && grade.eixos.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Eixos Pedagógicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {grade.eixos.map((eixo) => (
                    <div
                      key={eixo.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-xs font-medium"
                    >
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: eixo.cor ?? "#3B82F6" }} />
                      {eixo.nome}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {agendamentosDaMorada.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Próximos Agendamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agendamentosDaMorada.slice(0, 4).map((ag) => (
                  <div key={ag.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{ag.formacaoTema}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(ag.dataInicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        {ag.local && ` · ${ag.local}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_FORMACAO_COLORS[ag.status]}`}>
                      {STATUS_FORMACAO_LABELS[ag.status]}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB FORMANDOS */}
        <TabsContent value="formandos" className="mt-4">
          {formandosDaMorada.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum formando nesta morada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {formandosDaMorada.map((formando) => {
                const progresso = Math.round((formando.formacoesRealizadas / formando.totalFormacoes) * 100);
                const { total, presentes: pres, pct } = calcPresencaFormando(formando.id);
                const initials = formando.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

                return (
                  <Card key={formando.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className={`text-sm font-semibold ${NIVEL_CORES[formando.nivelFormativo]}`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <Link
                              href={`/formandos/${formando.id}`}
                              className="text-sm font-semibold hover:text-primary transition-colors"
                            >
                              {formando.nome}
                            </Link>
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${formando.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}`}
                            >
                              {formando.ativo ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {MODALIDADE_LABELS[formando.modalidade]}
                            {total > 0 && ` · ${pres}/${total} presenças (${pct}%)`}
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Progresso formativo</span>
                              <span className="font-medium">{formando.formacoesRealizadas}/{formando.totalFormacoes}</span>
                            </div>
                            <Progress value={progresso} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB PRESENÇA */}
        <TabsContent value="presenca" className="mt-4 space-y-4">
          {formandosDaMorada.length > 0 && realizadas.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Adesão por Formando</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formandosDaMorada.map((f) => {
                    const { total, presentes: pres, pct } = calcPresencaFormando(f.id);
                    if (total === 0) return null;
                    return (
                      <div key={f.id} className="flex items-center gap-3">
                        <p className="text-xs font-medium w-32 truncate shrink-0">{f.nome.split(" ")[0]}</p>
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                          {pres}/{total} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1.5">Selecionar Formação</p>
                  <Select value={agendamentoId} onValueChange={(v) => v && setAgendamentoId(v)}>
                    <SelectTrigger className="w-full sm:w-96">
                      <SelectValue placeholder="Escolha uma formação..." />
                    </SelectTrigger>
                    <SelectContent>
                      {realizadas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.formacaoTema} —{" "}
                          {format(parseISO(a.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {agendamento && (
                  <div className="flex gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-semibold">{presentes}</span>
                      <span className="text-muted-foreground">presentes</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-red-500">
                      <XCircle className="h-4 w-4" />
                      <span className="font-semibold">{ausentes}</span>
                      <span className="text-muted-foreground">ausentes</span>
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {agendamento ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-sm">{agendamento.formacaoTema}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(agendamento.dataInicio), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {agendamento.local && ` · ${agendamento.local}`}
                    </p>
                  </div>
                  <Button size="sm" onClick={handleSalvarPresenca} className="shrink-0 gap-1.5">
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formandosDaMorada.map((formando) => {
                    const presente = getPresenca(formando.id);
                    return (
                      <div
                        key={formando.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer select-none",
                          presente
                            ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                            : "border-border bg-card hover:bg-muted/40"
                        )}
                        onClick={() => togglePresenca(formando.id, formando.nome)}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {formando.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{formando.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-medium", presente ? "text-emerald-600" : "text-muted-foreground")}>
                            {presente ? "Presente" : "Ausente"}
                          </span>
                          {presente ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground/50 shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  Selecione uma formação para registrar a presença
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB COMENTÁRIOS */}
        <TabsContent value="comentarios" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setComentarioOpen(true)} className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Novo Comentário
            </Button>
          </div>

          {comentariosDaMorada.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum comentário registrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {comentariosDaMorada.map((comentario) => {
                const formando = allFormandos.find((f) => f.id === comentario.formandoId);
                const initials = comentario.formandoNome.split(" ").map((n) => n[0]).slice(0, 2).join("");
                return (
                  <Card key={comentario.id} className="border-0 shadow-sm">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-sm font-semibold">{comentario.formandoNome}</span>
                            {formando && (
                              <Badge className={NIVEL_CORES[formando.nivelFormativo]}>
                                {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
                              </Badge>
                            )}
                            <Badge className={TIPO_COMENTARIO_CORES[comentario.tipo]}>
                              {TIPO_COMENTARIO_LABELS[comentario.tipo]}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {format(parseISO(comentario.criadoEm), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80 leading-relaxed">{comentario.texto}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Morada</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Endereço</Label>
              <Input
                value={editForm.endereco}
                onChange={(e) => setEditForm((p) => ({ ...p, endereco: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comentário Dialog */}
      <Dialog open={comentarioOpen} onOpenChange={setComentarioOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Comentário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Formando</Label>
              <Select value={novoFormandoId} onValueChange={(v) => setNovoFormandoId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o formando..." />
                </SelectTrigger>
                <SelectContent>
                  {formandosDaMorada.filter((f) => f.ativo).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={novoTipo} onValueChange={(v) => v && setNovoTipo(v as TipoComentario)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["adesao", "dificuldade", "progresso", "observacao"] as TipoComentario[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_COMENTARIO_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Comentário</Label>
              <Textarea
                placeholder="Descreva sua observação..."
                className="min-h-24 resize-none"
                value={novoTexto}
                onChange={(e) => setNovoTexto(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setComentarioOpen(false)}>Cancelar</Button>
            <Button onClick={handleSalvarComentario} disabled={!novoFormandoId || !novoTexto.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
