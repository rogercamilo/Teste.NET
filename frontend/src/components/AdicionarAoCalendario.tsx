"use client";

import { useState } from "react";
import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  buildEventIcs,
  googleCalendarUrl,
  icsFileName,
  type CalendarEvent,
} from "@/lib/ics";

interface AdicionarAoCalendarioProps {
  event: CalendarEvent;
  /** Rótulo do gatilho. Use `compact` para mostrar só o ícone. */
  label?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Botão "Adicionar ao calendário" — abre um popover com duas opções:
 * Google Agenda (link) e download do `.ics` (Apple/Outlook/qualquer app).
 * Tudo gerado no cliente a partir dos dados já presentes na página; sem
 * endpoint novo e sem dependência de autenticação (funciona no Portal
 * token-based e na Agenda autenticada). Ver lib/ics.ts.
 */
export function AdicionarAoCalendario({
  event,
  label = "Adicionar ao calendário",
  compact = false,
  className,
}: AdicionarAoCalendarioProps) {
  const [open, setOpen] = useState(false);

  function baixarIcs() {
    const conteudo = buildEventIcs(event);
    const blob = new Blob([conteudo], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = icsFileName(event.title);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          className
        )}
      >
        <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
        {!compact && <span>{label}</span>}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={6} className="w-56 p-1.5">
        <a
          href={googleCalendarUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
          Google Agenda
        </a>
        <button
          type="button"
          onClick={baixarIcs}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
          Baixar .ics (Apple / Outlook)
        </button>
      </PopoverContent>
    </Popover>
  );
}
