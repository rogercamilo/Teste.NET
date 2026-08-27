import { describe, it, expect } from "vitest";
import {
  buildEventIcs,
  googleCalendarUrl,
  icsFileName,
  type CalendarEvent,
} from "@/lib/ics";

const evento: CalendarEvent = {
  id: "ag_123",
  title: "Formação: Discipulado, parte 1",
  start: "2026-07-15T18:30:00.000Z",
  end: "2026-07-15T20:00:00.000Z",
  description: "Trazer o caderno; sala 2",
  location: "Salão Paroquial",
};

describe("buildEventIcs", () => {
  const ics = buildEventIcs(evento, "2026-07-01T12:00:00.000Z");

  it("gera um VCALENDAR/VEVENT válido com CRLF", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("formata datas em UTC básico (YYYYMMDDTHHMMSSZ)", () => {
    expect(ics).toContain("DTSTART:20260715T183000Z");
    expect(ics).toContain("DTEND:20260715T200000Z");
    expect(ics).toContain("DTSTAMP:20260701T120000Z");
  });

  it("usa o id como UID e inclui SUMMARY/LOCATION", () => {
    expect(ics).toContain("UID:ag_123@formattio.com.br");
    expect(ics).toContain("LOCATION:Salão Paroquial");
  });

  it("escapa vírgula e ponto-e-vírgula no texto (RFC 5545)", () => {
    expect(ics).toContain("SUMMARY:Formação: Discipulado\\, parte 1");
    expect(ics).toContain("DESCRIPTION:Trazer o caderno\\; sala 2");
  });

  it("omite DESCRIPTION/LOCATION quando ausentes", () => {
    const minimal = buildEventIcs({
      id: "x",
      title: "Sem extras",
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-01T01:00:00.000Z",
    });
    expect(minimal).not.toContain("DESCRIPTION:");
    expect(minimal).not.toContain("LOCATION:");
  });

  it("lança em data inválida", () => {
    expect(() =>
      buildEventIcs({ id: "x", title: "t", start: "não-é-data", end: "2026-01-01T00:00:00Z" })
    ).toThrow();
  });
});

describe("buildEventIcs — dia inteiro", () => {
  // Evento de dia inteiro em 15/07/2026 (fuso America/Sao_Paulo, UTC-3):
  // início 00:00 BRT = 03:00Z; fim 23:59 BRT = 02:59Z do dia seguinte.
  const allDay: CalendarEvent = {
    id: "ag_dia",
    title: "Retiro",
    start: "2026-07-15T03:00:00.000Z",
    end: "2026-07-16T02:59:00.000Z",
    allDay: true,
  };
  const ics = buildEventIcs(allDay, "2026-07-01T12:00:00.000Z");

  it("usa VALUE=DATE e DTEND exclusivo (dia seguinte), sem rolar o fuso", () => {
    expect(ics).toContain("DTSTART;VALUE=DATE:20260715");
    expect(ics).toContain("DTEND;VALUE=DATE:20260716");
    expect(ics).not.toContain("DTSTART:2026");
  });
});

describe("googleCalendarUrl", () => {
  it("monta a URL TEMPLATE com datas UTC e parâmetros codificados", () => {
    const url = googleCalendarUrl(evento);
    expect(url.startsWith("https://calendar.google.com/calendar/render?")).toBe(true);
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("dates=20260715T183000Z%2F20260715T200000Z");
    expect(url).toContain("location=Sal%C3%A3o+Paroquial");
  });

  it("usa datas puras (YYYYMMDD) em evento de dia inteiro", () => {
    const url = googleCalendarUrl({
      id: "ag_dia",
      title: "Retiro",
      start: "2026-07-15T03:00:00.000Z",
      end: "2026-07-16T02:59:00.000Z",
      allDay: true,
    });
    expect(url).toContain("dates=20260715%2F20260716");
  });
});

describe("icsFileName", () => {
  it("gera slug ASCII com extensão .ics", () => {
    expect(icsFileName("Formação: Discipulado, parte 1")).toBe("formacao-discipulado-parte-1.ics");
  });

  it("cai em 'evento.ics' quando o título não tem caracteres úteis", () => {
    expect(icsFileName("!!!")).toBe("evento.ics");
  });
});
