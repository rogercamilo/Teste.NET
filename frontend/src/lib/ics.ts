/**
 * Geração de eventos de calendário (iCalendar / RFC 5545) e link do Google Agenda.
 *
 * Módulo ISOMÓRFICO (sem `server-only`, sem Node APIs) — usado no cliente para
 * gerar um `.ics` baixável e o link "Adicionar ao Google Agenda". As datas dos
 * agendamentos são timestamps reais (ISO com offset), então formatamos em UTC
 * (`...Z`) — não há o risco de fuso das datas "date-only"
 * (ver feedback-date-only-timezone).
 */

export interface CalendarEvent {
  /** Identificador estável do evento (ex.: id do agendamento) — vira o UID. */
  id: string;
  title: string;
  start: string | Date;
  end: string | Date;
  description?: string;
  location?: string;
}

const PRODID = "-//Formattio//Agenda//PT-BR";
const UID_DOMAIN = "formattio.com.br";

/** Converte uma data para o formato UTC básico do iCalendar: YYYYMMDDTHHMMSSZ. */
function toIcsUtc(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error("Data inválida para evento de calendário");
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapa texto conforme RFC 5545 §3.3.11 (barra, ponto-e-vírgula, vírgula, quebra de linha). */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Dobra linhas longas em 75 octetos (RFC 5545 §3.1) com continuação por espaço. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 74) {
    chunks.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length) chunks.push(" " + rest);
  return chunks.join("\r\n");
}

/**
 * Monta o conteúdo de um arquivo `.ics` (uma VEVENT) pronto para download.
 * O `dtStamp` é parametrizável para permitir saída determinística em testes.
 */
export function buildEventIcs(event: CalendarEvent, dtStamp: string | Date = new Date()): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@${UID_DOMAIN}`,
    `DTSTAMP:${toIcsUtc(dtStamp)}`,
    `DTSTART:${toIcsUtc(event.start)}`,
    `DTEND:${toIcsUtc(event.end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];

  if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`);

  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");

  return lines.map(foldLine).join("\r\n");
}

/** URL "Adicionar ao Google Agenda" (template TEMPLATE) — abre em nova aba. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsUtc(event.start)}/${toIcsUtc(event.end)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Nome de arquivo seguro para o `.ics` (sem acentos/símbolos problemáticos). */
export function icsFileName(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  return `${slug || "evento"}.ics`;
}
