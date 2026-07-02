"use client";

import Link from "next/link";
import { addDays, parseISO, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, MapPin, Video, ChevronRight, CheckCircle2,
  AlertTriangle, Cake, Sparkles, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NIVEL_FORMATIVO_LABELS,
  type DashboardStats,
  type PerfilUsuario,
} from "@/types";
import type { useTermos } from "@/lib/data-store";

interface Props {
  stats: DashboardStats;
  perfil: PerfilUsuario;
  termos: ReturnType<typeof useTermos>;
}

interface Pendencia {
  label: string;
  href: string;
}

function SectionCard({
  icon: Icon,
  title,
  children,
  footer,
}: {
  icon: typeof CalendarDays;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2.5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">{children}</CardContent>
      {footer && <div className="px-6 pb-4 pt-1">{footer}</div>}
    </Card>
  );
}

function VazioLinha({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-sm text-muted-foreground">{children}</p>;
}

export function MinhaSemana({ stats, perfil, termos }: Props) {
  const isFC = perfil === "formador_comunitario";
  const agora = new Date();
  const fimSemana = addDays(agora, 7);

  // ── Próximos encontros (próximos 7 dias) ──
  const encontros = stats.proximasFormacoes
    .map((a) => ({ ...a, inicio: parseISO(a.dataInicio) }))
    .filter((a) => a.inicio <= fimSemana)
    .slice(0, 4);

  // ── Pendências (por perfil, a partir de sinais já computados) ──
  const pendencias: Pendencia[] = [];
  if (isFC) {
    const risco = (stats.formandosPresenca ?? []).filter((f) => f.taxa >= 0 && f.taxa < 50).length;
    if (risco > 0) {
      pendencias.push({
        label: `${risco} ${termos.formando.toLowerCase()}${risco > 1 ? "s" : ""} com presença abaixo de 50%`,
        href: "/presenca",
      });
    }
  } else {
    const g = termos.grupoFormacao.toLowerCase();
    if (stats.gruposFormacaoSemPlano) pendencias.push({ label: `${stats.gruposFormacaoSemPlano} ${g}${stats.gruposFormacaoSemPlano > 1 ? "s" : ""} sem plano vinculado`, href: "/grupos-formacao" });
    if (stats.gruposFormacaoSemGrade) pendencias.push({ label: `${stats.gruposFormacaoSemGrade} ${g}${stats.gruposFormacaoSemGrade > 1 ? "s" : ""} sem grade vinculada`, href: "/grupos-formacao" });
    if (stats.gruposFormacaoComGradeExpirada) pendencias.push({ label: `${stats.gruposFormacaoComGradeExpirada} ${g}${stats.gruposFormacaoComGradeExpirada > 1 ? "s" : ""} com etapa encerrada`, href: "/grupos-formacao" });
    if (stats.fcsSemGrupoFormacao) pendencias.push({ label: `${stats.fcsSemGrupoFormacao} formador${stats.fcsSemGrupoFormacao > 1 ? "es" : ""} sem ${g}`, href: "/configuracoes" });
  }

  // ── Destaques (aniversariantes + marcos formativos) ──
  const aniversarios = stats.aniversariantesSemana ?? [];
  const marcos = stats.marcosFormativos ?? [];
  const semDestaques = aniversarios.length === 0 && marcos.length === 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Próximos encontros */}
      <SectionCard
        icon={CalendarDays}
        title="Esta semana"
        footer={
          <Link href="/agenda" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 text-xs -ml-2")}>
            Ver agenda
            <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </Link>
        }
      >
        {encontros.length === 0 ? (
          <VazioLinha>Nenhum encontro nos próximos 7 dias.</VazioLinha>
        ) : (
          encontros.map((e) => {
            const hoje = isSameDay(e.inicio, agora);
            return (
              <Link
                key={e.id}
                href="/agenda"
                className="flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/60"
              >
                <div className={cn(
                  "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border text-center",
                  hoje ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-muted/40 text-foreground"
                )}>
                  <span className="text-[10px] font-medium uppercase leading-none">{format(e.inicio, "EEE", { locale: ptBR })}</span>
                  <span className="text-base font-bold leading-tight">{format(e.inicio, "dd")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{e.formacaoTema}</p>
                  <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <span>{format(e.inicio, "HH:mm")}</span>
                    {e.local && (<><span>·</span><MapPin className="h-3 w-3" /><span className="truncate">{e.local}</span></>)}
                    {!e.local && e.linkOnline && (<><span>·</span><Video className="h-3 w-3" /><span>Online</span></>)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </SectionCard>

      {/* Pendências */}
      <SectionCard icon={AlertTriangle} title="Pendências">
        {pendencias.length === 0 ? (
          <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Tudo em dia por aqui.
          </p>
        ) : (
          pendencias.map((p, i) => (
            <Link
              key={i}
              href={p.href}
              className="flex items-center gap-2.5 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/60"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              <span className="min-w-0 flex-1 text-sm text-foreground">{p.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))
        )}
      </SectionCard>

      {/* Destaques */}
      <SectionCard icon={Sparkles} title="Destaques">
        {semDestaques ? (
          <VazioLinha>Sem aniversários ou marcos formativos esta semana.</VazioLinha>
        ) : (
          <>
            {aniversarios.map((a) => (
              <Link
                key={`b-${a.id}`}
                href={`/formandos/${a.id}`}
                className="flex items-center gap-2.5 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/60"
              >
                <Cake className="h-4 w-4 shrink-0 text-rose-500" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  <span className="font-medium">{a.nome}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{a.quando}</span>
              </Link>
            ))}
            {marcos.map((m) => (
              <Link
                key={`m-${m.id}`}
                href={`/formandos/${m.id}`}
                className="flex items-center gap-2.5 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/60"
              >
                <TrendingUp className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  <span className="font-medium">{m.nome}</span>
                  <span className="text-muted-foreground"> · {NIVEL_FORMATIVO_LABELS[m.nivelFormativo]}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-emerald-600">{m.progresso}%</span>
              </Link>
            ))}
          </>
        )}
      </SectionCard>
    </div>
  );
}
