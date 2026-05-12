"use client";

import { useState } from "react";
import { mockAgendamentos, mockFormandos, mockPresencas } from "@/lib/mock-data";
import {
  NIVEL_CORES,
  NIVEL_FORMATIVO_LABELS,
  type PresencaFormacao,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Users, ClipboardList, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const realizadas = mockAgendamentos.filter(
  (a) => a.status === "realizada" || a.status === "confirmada"
);

export default function PresencaPage() {
  const [agendamentoId, setAgendamentoId] = useState<string>(realizadas[0]?.id ?? "");
  const [presencas, setPresencas] = useState<PresencaFormacao[]>(mockPresencas);

  const agendamento = mockAgendamentos.find((a) => a.id === agendamentoId);

  const formandosDaFormacao = mockFormandos.filter((f) => f.ativo);

  const getPresenca = (formandoId: string): boolean => {
    const registro = presencas.find(
      (p) => p.agendamentoId === agendamentoId && p.formandoId === formandoId
    );
    return registro?.presente ?? false;
  };

  const togglePresenca = (formandoId: string, formandoNome: string) => {
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
      const formando = mockFormandos.find((f) => f.id === formandoId);
      return [
        ...prev,
        {
          id: `pr-${Date.now()}`,
          agendamentoId,
          formacaoTema: agendamento?.formacaoTema ?? "",
          data: agendamento?.dataInicio.split("T")[0] ?? "",
          formandoId,
          formandoNome: formandoNome,
          nivelFormativo: formando?.nivelFormativo ?? "pre-discipulado",
          presente: true,
        },
      ];
    });
  };

  const presentes = formandosDaFormacao.filter((f) => getPresenca(f.id)).length;
  const ausentes = formandosDaFormacao.length - presentes;

  function handleSalvar() {
    toast.success("Lista de presença salva com sucesso!");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Presença</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registre a presença dos formandos nas formações realizadas
          </p>
        </div>
        <Button onClick={handleSalvar} className="gap-2 self-start sm:self-auto">
          <Save className="h-4 w-4" />
          Salvar Presença
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
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
                      <span className="truncate">
                        {a.formacaoTema} —{" "}
                        {format(parseISO(a.dataInicio), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {agendamento && (
              <div className="flex gap-3 text-sm">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-semibold">{presentes}</span>
                  <span className="text-muted-foreground">presentes</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-500">
                  <XCircle className="h-4 w-4" />
                  <span className="font-semibold">{ausentes}</span>
                  <span className="text-muted-foreground">ausentes</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {agendamento ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{agendamento.formacaoTema}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(parseISO(agendamento.dataInicio), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {agendamento.local && ` · ${agendamento.local}`}
                </p>
              </div>
              <Badge className={NIVEL_CORES[agendamento.nivelFormativo]}>
                {NIVEL_FORMATIVO_LABELS[agendamento.nivelFormativo]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{formandosDaFormacao.length} formandos</span>
            </div>
            <div className="space-y-2">
              {formandosDaFormacao.map((formando) => {
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
                      <span
                        className={cn(
                          "text-xs font-medium",
                          presente ? "text-emerald-600" : "text-muted-foreground"
                        )}
                      >
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">
              Selecione uma formação para registrar a presença
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
