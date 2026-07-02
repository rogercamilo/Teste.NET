import { describe, it, expect } from "vitest";
import {
  progressoNaEtapa,
  estaAtrasadoNoRitmo,
  pctEsperadoNoRitmo,
  funilPorEtapa,
  taxaPresenca90d,
  mesesEntre,
  avaliarRiscoFormando,
  decidirAcaoRisco,
} from "@/lib/jornada-progresso";
import type { NivelFormativo, ProgressoEtapa } from "@/types";

const prog = (over: Partial<ProgressoEtapa> & { nivel: NivelFormativo }): ProgressoEtapa => ({
  formacoesComunitariasRealizadas: 0,
  retirosComunitariosRealizados: 0,
  retirosPessoaisRealizados: 0,
  ...over,
});

describe("progressoNaEtapa", () => {
  it("soma as três realizadas e calcula o pct sobre o requerido", () => {
    // pre-discipulado requer 104 + 2 + 8 = 114
    const r = progressoNaEtapa("pre-discipulado", [
      prog({ nivel: "pre-discipulado", formacoesComunitariasRealizadas: 52, retirosComunitariosRealizados: 1, retirosPessoaisRealizados: 4 }),
    ]);
    expect(r.total).toBe(114);
    expect(r.done).toBe(57);
    expect(r.pct).toBe(50);
  });

  it("retorna 0 quando não há progresso para o nível", () => {
    const r = progressoNaEtapa("discipulado", [prog({ nivel: "pre-discipulado", formacoesComunitariasRealizadas: 10 })]);
    expect(r.done).toBe(0);
    expect(r.pct).toBe(0);
  });

  it("limita o pct a 100 quando excede o requerido", () => {
    const r = progressoNaEtapa("pre-discipulado", [
      prog({ nivel: "pre-discipulado", formacoesComunitariasRealizadas: 200, retirosComunitariosRealizados: 5, retirosPessoaisRealizados: 20 }),
    ]);
    expect(r.pct).toBe(100);
  });
});

describe("pctEsperadoNoRitmo / estaAtrasadoNoRitmo", () => {
  it("pctEsperado é linear e limitado a 100", () => {
    expect(pctEsperadoNoRitmo(12, 2)).toBe(50); // metade de 2 anos
    expect(pctEsperadoNoRitmo(48, 2)).toBe(100); // além do prazo
  });

  it("não sinaliza quem está no ritmo", () => {
    // 12 meses de 24 → esperado 50%; concluído 45% (5pp abaixo, dentro da margem)
    expect(estaAtrasadoNoRitmo(45, 50, 12)).toBe(false);
  });

  it("sinaliza quem está muito atrás do ritmo", () => {
    // esperado 60%, concluído 20% (40pp abaixo) e 14 meses na etapa
    expect(estaAtrasadoNoRitmo(20, 60, 14)).toBe(true);
  });

  it("não sinaliza cedo demais na etapa (abaixo do piso de meses)", () => {
    expect(estaAtrasadoNoRitmo(0, 40, 1)).toBe(false);
  });
});

describe("funilPorEtapa", () => {
  it("distribui membros ativos e ignora inativos; percentuais somam ~100", () => {
    const f = funilPorEtapa([
      { nivelFormativo: "pre-discipulado", ativo: true },
      { nivelFormativo: "pre-discipulado", ativo: true },
      { nivelFormativo: "discipulado", ativo: true },
      { nivelFormativo: "discipulado", ativo: false }, // ignorado
    ]);
    const pre = f.find((x) => x.nivel === "pre-discipulado")!;
    const disc = f.find((x) => x.nivel === "discipulado")!;
    expect(pre.quantidade).toBe(2);
    expect(pre.percentual).toBe(67);
    expect(disc.quantidade).toBe(1);
    expect(disc.percentual).toBe(33);
  });
});

describe("taxaPresenca90d", () => {
  const hoje = new Date(2026, 6, 2);
  const iso = (d: Date) => d.toISOString();

  it("calcula a taxa dentro da janela e ignora fora dela", () => {
    const dentro1 = iso(new Date(2026, 5, 20));
    const dentro2 = iso(new Date(2026, 5, 25));
    const fora = iso(new Date(2026, 0, 1));
    const r = taxaPresenca90d(
      [
        { formandoId: "a", data: dentro1, presente: true },
        { formandoId: "a", data: dentro2, presente: false },
        { formandoId: "a", data: fora, presente: true },
        { formandoId: "b", data: dentro1, presente: true },
      ],
      "a",
      hoje
    );
    expect(r).toBe(50);
  });

  it("retorna null quando não há registros na janela", () => {
    expect(taxaPresenca90d([], "a", hoje)).toBeNull();
  });
});

describe("mesesEntre", () => {
  it("retorna null sem data e um valor positivo com data passada", () => {
    expect(mesesEntre(undefined)).toBeNull();
    const m = mesesEntre(new Date(2025, 6, 2).toISOString(), new Date(2026, 6, 2));
    expect(m).not.toBeNull();
    expect(Math.round(m as number)).toBe(12);
  });
});

describe("avaliarRiscoFormando", () => {
  const hoje = new Date(2026, 6, 2);
  const presenca = (formandoId: string, presente: boolean, data = new Date(2026, 5, 20)) => ({
    formandoId,
    data: data.toISOString(),
    presente,
  });

  it("sinaliza risco por ritmo (iniciou há muito, progresso baixo)", () => {
    // pre-discipulado: 2 anos. iniciou há 20 meses → esperado ~83%; concluído ~9%
    const r = avaliarRiscoFormando(
      {
        nivelFormativo: "pre-discipulado",
        progressoEtapas: [
          prog({ nivel: "pre-discipulado", formacoesComunitariasRealizadas: 10, iniciouEm: new Date(2024, 10, 2).toISOString() }),
        ],
      },
      [presenca("a", true)],
      hoje,
      "a"
    );
    expect(r.emRisco).toBe(true);
    expect(r.motivos.some((m) => m.includes("etapa"))).toBe(true);
  });

  it("sinaliza risco por presença baixa mesmo sem atraso de ritmo", () => {
    const r = avaliarRiscoFormando(
      { nivelFormativo: "pre-discipulado", progressoEtapas: [] },
      [presenca("b", false), presenca("b", false), presenca("b", true)],
      hoje,
      "b"
    );
    expect(r.emRisco).toBe(true);
    expect(r.motivos.some((m) => m.startsWith("presença"))).toBe(true);
  });

  it("não sinaliza formando saudável (presença ok, sem iniciouEm)", () => {
    const r = avaliarRiscoFormando(
      { nivelFormativo: "pre-discipulado", progressoEtapas: [] },
      [presenca("c", true), presenca("c", true)],
      hoje,
      "c"
    );
    expect(r.emRisco).toBe(false);
    expect(r.motivos).toHaveLength(0);
  });
});

describe("decidirAcaoRisco", () => {
  const hoje = new Date(2026, 6, 2);

  it("em risco sem histórico → alertar", () => {
    expect(decidirAcaoRisco(true, null, hoje)).toBe("alertar");
  });

  it("em risco recém-alertado (<14d) → nada", () => {
    expect(decidirAcaoRisco(true, new Date(2026, 5, 28), hoje)).toBe("nada");
  });

  it("em risco com alerta antigo (≥14d) → alertar", () => {
    expect(decidirAcaoRisco(true, new Date(2026, 5, 1), hoje)).toBe("alertar");
  });

  it("recuperou com alerta prévio → resetar", () => {
    expect(decidirAcaoRisco(false, new Date(2026, 5, 20), hoje)).toBe("resetar");
  });

  it("saudável sem histórico → nada", () => {
    expect(decidirAcaoRisco(false, null, hoje)).toBe("nada");
  });
});
