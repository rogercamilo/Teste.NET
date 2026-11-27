import { describe, it, expect } from "vitest";
import { classificarEventoProgresso, presencaCumprida } from "@/lib/progresso-presenca";

describe("classificarEventoProgresso", () => {
  it("formação e formação complementar contam como formação comunitária", () => {
    expect(classificarEventoProgresso("formacao")).toBe("formacao");
    expect(classificarEventoProgresso("formacao_complementar")).toBe("formacao");
  });

  it("retiro conta como retiro comunitário", () => {
    expect(classificarEventoProgresso("retiro")).toBe("retiro");
  });

  it("eventos institucionais/1:1 não cumprem requisito de etapa", () => {
    for (const t of ["convocacao", "reuniao", "outro", "acompanhamento_comunitario"]) {
      expect(classificarEventoProgresso(t)).toBeNull();
    }
  });
});

describe("presencaCumprida", () => {
  it("usa statusFormador quando presente", () => {
    expect(presencaCumprida({ statusFormador: "presente" })).toBe(true);
    expect(presencaCumprida({ statusFormador: "ausente" })).toBe(false);
    expect(presencaCumprida({ statusFormador: "justificado" })).toBe(false);
  });

  it("retrocompat: sem statusFormador, cai no booleano presente", () => {
    expect(presencaCumprida({ presente: true })).toBe(true);
    expect(presencaCumprida({ presente: false })).toBe(false);
    expect(presencaCumprida({})).toBe(false);
  });

  it("statusFormador tem precedência sobre presente", () => {
    expect(presencaCumprida({ statusFormador: "ausente", presente: true })).toBe(false);
  });
});
