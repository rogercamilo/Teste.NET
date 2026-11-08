import { describe, it, expect } from "vitest";
import {
  avaliarCadenciaAcompanhamento,
  normalizarCadencia,
  cadenciaLabel,
} from "@/lib/acompanhamento-cadencia";

const HOJE = new Date("2026-11-08T12:00:00Z");

describe("normalizarCadencia", () => {
  it("mantém 1..3", () => {
    expect(normalizarCadencia(1)).toBe(1);
    expect(normalizarCadencia(2)).toBe(2);
    expect(normalizarCadencia(3)).toBe(3);
  });
  it("cai em 1 (Mensal) fora da faixa ou inválido", () => {
    expect(normalizarCadencia(0)).toBe(1);
    expect(normalizarCadencia(4)).toBe(1);
    expect(normalizarCadencia(null)).toBe(1);
    expect(normalizarCadencia(undefined)).toBe(1);
    expect(normalizarCadencia(NaN)).toBe(1);
  });
});

describe("cadenciaLabel", () => {
  it("rotula 1/2/3 e cai em Mensal fora da faixa", () => {
    expect(cadenciaLabel(1)).toBe("Mensal");
    expect(cadenciaLabel(2)).toBe("Bimestral");
    expect(cadenciaLabel(3)).toBe("Trimestral");
    expect(cadenciaLabel(99)).toBe("Mensal");
  });
});

describe("avaliarCadenciaAcompanhamento", () => {
  it("nunca acompanhado → precisa de ação", () => {
    const r = avaliarCadenciaAcompanhamento(1, null, HOJE);
    expect(r.status).toBe("nunca");
    expect(r.precisaAcao).toBe(true);
    expect(r.proximoEsperado).toBeNull();
    expect(r.diasDesdeUltimo).toBeNull();
  });

  it("mensal: acompanhado há 10 dias → em dia", () => {
    const ultimo = new Date("2026-10-29T12:00:00Z");
    const r = avaliarCadenciaAcompanhamento(1, ultimo, HOJE);
    expect(r.status).toBe("em_dia");
    expect(r.precisaAcao).toBe(false);
    expect(r.diasDesdeUltimo).toBe(10);
  });

  it("mensal: acompanhado há 40 dias → atrasado com dias de atraso", () => {
    const ultimo = new Date("2026-09-29T12:00:00Z");
    const r = avaliarCadenciaAcompanhamento(1, ultimo, HOJE);
    expect(r.status).toBe("atrasado");
    expect(r.precisaAcao).toBe(true);
    // prazo = 29/10; hoje = 08/11 → 10 dias de atraso
    expect(r.diasAtraso).toBe(10);
  });

  it("mensal: dentro da janela final (prazo em 5 dias) → vence em breve", () => {
    // último = 13/10 → prazo = 13/11 → faltam 5 dias
    const ultimo = new Date("2026-10-13T12:00:00Z");
    const r = avaliarCadenciaAcompanhamento(1, ultimo, HOJE);
    expect(r.status).toBe("vence_em_breve");
    expect(r.precisaAcao).toBe(false);
  });

  it("bimestral: mesmo acompanhamento de 40 dias atrás fica em dia", () => {
    const ultimo = new Date("2026-09-29T12:00:00Z");
    const r = avaliarCadenciaAcompanhamento(2, ultimo, HOJE);
    expect(r.status).toBe("em_dia");
  });

  it("trimestral: acompanhado há ~100 dias → atrasado", () => {
    const ultimo = new Date("2026-07-30T12:00:00Z");
    const r = avaliarCadenciaAcompanhamento(3, ultimo, HOJE);
    expect(r.status).toBe("atrasado");
  });

  it("cadência inválida cai em mensal", () => {
    const ultimo = new Date("2026-09-29T12:00:00Z");
    const r = avaliarCadenciaAcompanhamento(0, ultimo, HOJE);
    expect(r.status).toBe("atrasado"); // tratado como mensal
  });
});
