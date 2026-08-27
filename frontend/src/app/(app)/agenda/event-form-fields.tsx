"use client";

/**
 * Primitivas de formulário de agendamento no estilo Google Agenda (adaptação
 * "meio-termo"): linhas com ícone à esquerda + faixa de horário início–fim com
 * toggle "Dia inteiro". Compartilhadas pelos formulários de Agendar/Editar evento
 * e de compromisso pessoal para manter o comportamento do "Dia inteiro" idêntico.
 */
import type { ComponentType, ReactNode } from "react";
import { Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Linha de campo: ícone à esquerda + rótulo opcional + controle + dica opcional. */
export function IconField({
  icon: Icon,
  label,
  required,
  hint,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        {label && (
          <Label>
            {label}
            {required && <span className="text-destructive"> *</span>}
          </Label>
        )}
        {children}
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

type DateTimePatch = { dataInicio?: string; dataFim?: string; diaInteiro?: boolean };

/** Parte de data ("YYYY-MM-DD") de um valor datetime-local. */
const dateOf = (dt: string) => (dt ? dt.slice(0, 10) : "");
/** Hoje em "YYYY-MM-DD" no fuso local (sv-SE formata nesse padrão). */
const hojeStr = () => new Date().toLocaleDateString("sv-SE");

/**
 * Faixa início–fim com toggle "Dia inteiro". O estado do pai continua sendo
 * strings datetime-local ("YYYY-MM-DDTHH:mm"); no modo dia inteiro ancoramos
 * início 00:00 e fim 23:59 e exibimos inputs de data pura.
 */
export function DateTimeRange({
  dataInicio,
  dataFim,
  diaInteiro,
  onChange,
}: {
  dataInicio: string;
  dataFim: string;
  diaInteiro: boolean;
  onChange: (patch: DateTimePatch) => void;
}) {
  function toggleDiaInteiro(v: boolean) {
    const di = dateOf(dataInicio) || hojeStr();
    const df = dateOf(dataFim) || di;
    onChange(
      v
        ? { diaInteiro: true, dataInicio: `${di}T00:00`, dataFim: `${df}T23:59` }
        : { diaInteiro: false, dataInicio: `${di}T09:00`, dataFim: `${df}T10:00` }
    );
  }

  return (
    <IconField icon={Clock}>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label>
            Início<span className="text-destructive"> *</span>
          </Label>
          {diaInteiro ? (
            <Input
              type="date"
              value={dateOf(dataInicio)}
              onChange={(e) => onChange({ dataInicio: e.target.value ? `${e.target.value}T00:00` : "" })}
            />
          ) : (
            <Input
              type="datetime-local"
              value={dataInicio}
              onChange={(e) => onChange({ dataInicio: e.target.value })}
            />
          )}
        </div>
        <div className="grid gap-1.5">
          <Label>Fim</Label>
          {diaInteiro ? (
            <Input
              type="date"
              value={dateOf(dataFim)}
              onChange={(e) => onChange({ dataFim: e.target.value ? `${e.target.value}T23:59` : "" })}
            />
          ) : (
            <Input
              type="datetime-local"
              value={dataFim}
              onChange={(e) => onChange({ dataFim: e.target.value })}
            />
          )}
        </div>
      </div>
      <label className="mt-1 inline-flex w-fit cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={diaInteiro}
          onChange={(e) => toggleDiaInteiro(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border accent-primary"
        />
        Dia inteiro
      </label>
    </IconField>
  );
}

/** Texto de horário do evento: "19:00 — 20:00" ou "Dia inteiro". */
export function formatHorarioEvento(dataInicio: string, dataFim: string, diaInteiro?: boolean): string {
  if (diaInteiro) return "Dia inteiro";
  try {
    return `${format(parseISO(dataInicio), "HH:mm")} — ${format(parseISO(dataFim), "HH:mm")}`;
  } catch {
    return "";
  }
}
