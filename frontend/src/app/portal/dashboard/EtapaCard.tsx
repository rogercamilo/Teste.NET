"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, TrendingUp, Users, Tent, HeartHandshake, Award } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  NIVEL_FORMATIVO_LABELS,
  getProximaEtapa,
  type NivelFormativo,
} from "@/types";
import { NivelFormativoIcon } from "@/components/nivel-formativo-icon";
import type { PortalDashboardData } from "@/lib/portal-data";

type Progresso = NonNullable<PortalDashboardData["progresso"]>;

/**
 * Minha etapa formativa — herói do Portal do Formando, espelhando a linguagem
 * visual da Travessia do vocacionado: uma caixa de destaque com o avanço geral e
 * a próxima etapa como meta, seguida dos "requisitos" que acendem no clay da
 * marca conforme o formando cumpre as atividades da etapa (formações e retiros).
 * É a mesma estrutura de apresentação da TravessiaCard, com os dados que o
 * formando já tem — sem gamificação nova, só leitura clara do que falta.
 */
export function EtapaCard({
  progresso,
  nivelFormativo,
}: {
  progresso: Progresso;
  nivelFormativo: NivelFormativo;
}) {
  // Requisitos como "estações": só entram os que a etapa exige (max > 0).
  const categorias: {
    chave: string;
    label: string;
    icon: LucideIcon;
    value: number;
    max: number;
  }[] = [
    {
      chave: "formacoes",
      label: "Formações comunitárias",
      icon: Users,
      value: progresso.formacoesComunitariasRealizadas,
      max: progresso.requisitos.formacoesComunitarias,
    },
    {
      chave: "retiros-comunitarios",
      label: "Retiros comunitários",
      icon: Tent,
      value: progresso.retirosComunitariosRealizados,
      max: progresso.requisitos.retirosComunitarios,
    },
    {
      chave: "retiros-pessoais",
      label: "Retiros pessoais",
      icon: HeartHandshake,
      value: progresso.retirosPessoaisRealizados,
      max: progresso.requisitos.retirosPessoais,
    },
  ].filter((c) => c.max > 0);

  // Concluído = soma das atividades cumpridas, sem contar excedente por categoria
  // (fazer 4 de 3 formações não empurra o total acima de 100%).
  const concluidas = categorias.reduce((s, c) => s + Math.min(c.value, c.max), 0);
  const total = categorias.reduce((s, c) => s + c.max, 0);
  const completo = total > 0 && concluidas === total;
  // "100%" só quando TUDO foi cumprido — arredondar mostraria 100% cedo demais.
  const percentualGeral = completo ? 100 : total > 0 ? Math.min(99, Math.round((concluidas / total) * 100)) : 0;
  const faltam = Math.max(0, total - concluidas);
  const proxima = getProximaEtapa(nivelFormativo);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Minha etapa formativa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {total === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Esta etapa não tem requisitos de formações ou retiros a cumprir.
          </p>
        ) : (
          <>
            {/* Avanço geral + próxima etapa como meta */}
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-6 w-6 text-primary" />
                <div className="leading-tight">
                  <div className="text-2xl font-bold tabular-nums text-foreground">
                    {percentualGeral}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {concluidas} de {total}{" "}
                    {total === 1 ? "atividade" : "atividades"}
                  </div>
                </div>
              </div>
              <div className="text-right leading-tight">
                {proxima ? (
                  <>
                    <div className="text-xs text-muted-foreground">Próxima etapa</div>
                    <div className="text-sm font-medium text-foreground">
                      <NivelFormativoIcon
                        nivel={proxima}
                        className="mr-1 inline size-4 align-text-bottom"
                      />
                      {NIVEL_FORMATIVO_LABELS[proxima]}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Award className="h-4 w-4 text-primary" />
                    Última etapa da formação
                  </div>
                )}
              </div>
            </div>

            {/* Requisitos — barra + estações que acendem, com o que falta à frente */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                <span className="text-sm font-semibold text-foreground">Requisitos da etapa</span>
                <span className="text-xs text-muted-foreground">
                  {completo ? (
                    <span className="font-medium text-primary">Requisitos cumpridos!</span>
                  ) : (
                    <>
                      Faltam{" "}
                      <strong className="font-semibold text-primary">
                        {faltam} {faltam === 1 ? "atividade" : "atividades"}
                      </strong>{" "}
                      {proxima ? (
                        <>para “{NIVEL_FORMATIVO_LABELS[proxima]}”</>
                      ) : (
                        "para concluir"
                      )}
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Cada requisito acende conforme você cumpre as atividades da sua etapa.
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${percentualGeral}%` }}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {categorias.map((c) => {
                  const feito = c.value >= c.max;
                  const Icon = c.icon;
                  return (
                    <div
                      key={c.chave}
                      title={c.label}
                      className={
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors " +
                        (feito ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30")
                      }
                    >
                      <span
                        className={
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full " +
                          (feito ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")
                        }
                      >
                        {feito ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 leading-tight">
                        <div
                          className={
                            "text-sm font-semibold tabular-nums " +
                            (feito ? "text-foreground" : "text-muted-foreground")
                          }
                        >
                          {Math.min(c.value, c.max)}/{c.max}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">{c.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
