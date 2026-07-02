import { describe, it, expect } from "vitest";
import {
  saudacaoPorHora,
  primeiroNome,
  aniversariantesNaJanela,
  type PessoaAniversario,
} from "@/lib/dashboard-semana";

describe("saudacaoPorHora", () => {
  it("cobre as três faixas e as bordas", () => {
    expect(saudacaoPorHora(new Date(2026, 6, 2, 5, 0))).toBe("Bom dia");
    expect(saudacaoPorHora(new Date(2026, 6, 2, 8, 0))).toBe("Bom dia");
    expect(saudacaoPorHora(new Date(2026, 6, 2, 11, 59))).toBe("Bom dia");
    expect(saudacaoPorHora(new Date(2026, 6, 2, 12, 0))).toBe("Boa tarde");
    expect(saudacaoPorHora(new Date(2026, 6, 2, 17, 59))).toBe("Boa tarde");
    expect(saudacaoPorHora(new Date(2026, 6, 2, 18, 0))).toBe("Boa noite");
    expect(saudacaoPorHora(new Date(2026, 6, 2, 4, 0))).toBe("Boa noite");
  });
});

describe("primeiroNome", () => {
  it("extrai o primeiro token e trata vazios", () => {
    expect(primeiroNome("Maria Clara Souza")).toBe("Maria");
    expect(primeiroNome("  João  ")).toBe("João");
    expect(primeiroNome("")).toBe("");
    expect(primeiroNome(null)).toBe("");
    expect(primeiroNome(undefined)).toBe("");
  });
});

describe("aniversariantesNaJanela", () => {
  const pessoa = (id: string, nome: string, mes: number, dia: number): PessoaAniversario => ({
    id,
    nome,
    dataNascimento: new Date(1990, mes, dia, 12, 0, 0),
  });

  it("inclui aniversário hoje e amanhã com rótulos corretos", () => {
    const hoje = new Date(2026, 6, 2, 9, 0); // 02/07/2026
    const r = aniversariantesNaJanela(
      [pessoa("a", "Ana", 6, 2), pessoa("b", "Bruno", 6, 3)],
      hoje,
      7
    );
    expect(r.map((x) => x.id)).toEqual(["a", "b"]);
    expect(r[0].quando).toBe("hoje");
    expect(r[1].quando).toBe("amanhã");
  });

  it("exclui aniversário fora da janela de 7 dias", () => {
    const hoje = new Date(2026, 6, 2, 9, 0);
    const r = aniversariantesNaJanela([pessoa("c", "Caio", 6, 20)], hoje, 7);
    expect(r).toHaveLength(0);
  });

  it("trata a virada de ano (28/12 → 02/01 entra na janela)", () => {
    const hoje = new Date(2026, 11, 28, 9, 0); // 28/12
    const r = aniversariantesNaJanela([pessoa("d", "Davi", 0, 2)], hoje, 7); // 02/01
    expect(r).toHaveLength(1);
    expect(r[0].emDias).toBe(5);
  });

  it("ordena por proximidade do aniversário", () => {
    const hoje = new Date(2026, 6, 2, 9, 0);
    const r = aniversariantesNaJanela(
      [pessoa("far", "Longe", 6, 6), pessoa("near", "Perto", 6, 3)],
      hoje,
      7
    );
    expect(r.map((x) => x.id)).toEqual(["near", "far"]);
  });
});
