"use client";

import { use } from "react";
import { mockFormandos, mockAgendamentos } from "@/lib/mock-data";
import {
  NIVEL_FORMATIVO_LABELS,
  NIVEL_CORES,
  MODALIDADE_LABELS,
  STATUS_FORMACAO_LABELS,
  type StatusFormacao,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { format, parseISO, differenceInYears } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const formando = mockFormandos.find((f) => f.id === id);
  const historico = mockAgendamentos.slice(0, 4);

  if (!formando) {
    return (
      <div className="flex flex-col items-center py-20">
        <p className="text-muted-foreground">Formando não encontrado</p>
        <Link href="/formandos" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4")}>
          Voltar
        </Link>
      </div>
    );
  }

  const initials = formando.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const idade = differenceInYears(new Date(), parseISO(formando.dataNascimento));
  const progresso = Math.round((formando.formacoesRealizadas / formando.totalFormacoes) * 100);

  const trilhaEtapas = [
    { nivel: "pre-discipulado" as const, label: "Pré-Discipulado", total: 8, concluidas: 8 },
    { nivel: "discipulado" as const, label: "Discipulado", total: 15, concluidas: formando.nivelFormativo === "discipulado" ? formando.formacoesRealizadas : formando.nivelFormativo === "primeiras-promessas" || formando.nivelFormativo === "formacao-permanente" ? 15 : 0 },
    { nivel: "primeiras-promessas" as const, label: "Primeiras Promessas", total: 24, concluidas: formando.nivelFormativo === "primeiras-promessas" ? formando.formacoesRealizadas : formando.nivelFormativo === "formacao-permanente" ? 24 : 0 },
    { nivel: "formacao-permanente" as const, label: "Formação Permanente", total: 48, concluidas: formando.nivelFormativo === "formacao-permanente" ? formando.formacoesRealizadas : 0 },
  ];

  return (
    <div className="space-y-6 animate-in-fast">
      {/* Back + Header */}
      <div>
        <Link href="/formandos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-3 -ml-1 text-muted-foreground")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Formandos
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar className="h-16 w-16 shrink-0">
            <AvatarFallback className={`text-lg font-bold ${NIVEL_CORES[formando.nivelFormativo]}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{formando.nome}</h1>
              <Badge variant="outline" className={NIVEL_CORES[formando.nivelFormativo]}>
                {NIVEL_FORMATIVO_LABELS[formando.nivelFormativo]}
              </Badge>
              <Badge variant="outline" className={formando.ativo ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}>
                {formando.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" /> {formando.email}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" /> {formando.telefone}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm">Editar</Button>
            <Button size="sm">
              <Calendar className="h-4 w-4 mr-1.5" />
              Agendar
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
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
          <TabsTrigger value="jornada" className="text-xs h-7">Jornada Formativa</TabsTrigger>
          <TabsTrigger value="historico" className="text-xs h-7">Histórico</TabsTrigger>
          <TabsTrigger value="dados" className="text-xs h-7">Dados Pessoais</TabsTrigger>
        </TabsList>

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
                    {/* Indicador */}
                    <div className="flex flex-col items-center">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                        isConcluida ? "bg-emerald-100" :
                        isAtual ? "bg-primary/15 ring-2 ring-primary/30" :
                        "bg-muted"
                      }`}>
                        {isConcluida ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <span className={`text-sm font-bold ${isAtual ? "text-primary" : "text-muted-foreground"}`}>
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      {idx < trilhaEtapas.length - 1 && (
                        <div className={`flex-1 w-0.5 mt-1 min-h-[20px] ${isConcluida ? "bg-emerald-200" : "bg-border"}`} />
                      )}
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${isAtual ? "text-primary" : isConcluida ? "text-foreground" : "text-muted-foreground"}`}>
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
                      {!isPendente && (
                        <Progress value={pct} className="h-1.5" />
                      )}
                      {isPendente && (
                        <div className="h-1.5 bg-muted rounded-full" />
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Histórico de Formações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {historico.map((ag) => (
                <div key={ag.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ag.formacaoTema}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(ag.dataInicio), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLORS[ag.status]}`}>
                    {STATUS_FORMACAO_LABELS[ag.status]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dados" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 space-y-4">
              {[
                { icon: User, label: "Nome completo", value: formando.nome },
                { icon: Calendar, label: "Data de nascimento", value: `${format(parseISO(formando.dataNascimento), "dd/MM/yyyy")} (${idade} anos)` },
                { icon: User, label: "Estado civil", value: ESTADO_CIVIL_LABELS[formando.estadoCivil] },
                { icon: MapPin, label: "Modalidade", value: MODALIDADE_LABELS[formando.modalidade] },
                { icon: Calendar, label: "Data de ingresso", value: format(parseISO(formando.dataIngresso), "dd/MM/yyyy") },
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
    </div>
  );
}
