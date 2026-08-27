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
type CampoData = "dataInicio" | "dataFim";

/** Parte de data ("YYYY-MM-DD") de um valor datetime-local. */
const dateOf = (dt: string) => (dt ? dt.slice(0, 10) : "");
/** Parte de hora ("HH:mm") de um valor datetime-local. */
const timeOf = (dt: string) => (dt.length >= 16 ? dt.slice(11, 16) : "");
/** Hoje em "YYYY-MM-DD" no fuso local (sv-SE formata nesse padrão). */
const hojeStr = () => new Date().toLocaleDateString("sv-SE");

const HORA_PADRAO: Record<CampoData, string> = { dataInicio: "09:00", dataFim: "10:00" };

/**
 * Faixa início–fim no estilo Google Agenda: campos de DATA e HORA separados,
 * na horizontal, com toggle "Dia inteiro". O estado do pai continua sendo
 * strings datetime-local ("YYYY-MM-DDTHH:mm"); aqui só recompomos as partes.
 * No modo dia inteiro ancoramos início 00:00 e fim 23:59 e ocultamos a hora.
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
  const valorDe: Record<CampoData, string> = { dataInicio, dataFim };

  // Recompõe a string datetime-local ao trocar a DATA (preserva a hora atual).
  const setData = (campo: CampoData) => (data: string) => {
    if (!data) return onChange({ [campo]: "" });
    const hora = diaInteiro
      ? campo === "dataInicio" ? "00:00" : "23:59"
      : timeOf(valorDe[campo]) || HORA_PADRAO[campo];
    onChange({ [campo]: `${data}T${hora}` });
  };

  // Recompõe ao trocar a HORA (usa a data atual, ou hoje se ainda vazia).
  const setHora = (campo: CampoData) => (hora: string) => {
    const data = dateOf(valorDe[campo]) || hojeStr();
    onChange({ [campo]: `${data}T${hora || "00:00"}` });
  };

  function toggleDiaInteiro(v: boolean) {
    const di = dateOf(dataInicio) || hojeStr();
    const df = dateOf(dataFim) || di;
    onChange(
      v
        ? { diaInteiro: true, dataInicio: `${di}T00:00`, dataFim: `${df}T23:59` }
        : { diaInteiro: false, dataInicio: `${di}T09:00`, dataFim: `${df}T10:00` }
    );
  }

  const linha = (campo: CampoData, rotulo: string, obrigatorio?: boolean) => (
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-xs font-medium text-muted-foreground">
        {rotulo}
        {obrigatorio && <span className="text-destructive"> *</span>}
      </span>
      <Input
        type="date"
        className="min-w-0 flex-1"
        value={dateOf(valorDe[campo])}
        onChange={(e) => setData(campo)(e.target.value)}
      />
      {!diaInteiro && (
        <Input
          type="time"
          className="w-[92px] shrink-0"
          value={timeOf(valorDe[campo])}
          onChange={(e) => setHora(campo)(e.target.value)}
        />
      )}
    </div>
  );

  return (
    <IconField icon={Clock}>
      <div className="space-y-2">
        {linha("dataInicio", "Início", true)}
        {linha("dataFim", "Fim")}
        <label className="inline-flex w-fit cursor-pointer select-none items-center gap-2 pl-[52px] text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={diaInteiro}
            onChange={(e) => toggleDiaInteiro(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border accent-primary"
          />
          Dia inteiro
        </label>
      </div>
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
