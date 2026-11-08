import { describe, it, expect } from "vitest";
import { montarCorpoTermo } from "@/lib/livro-registro";

const ctxBase = { formandoNome: "Beatriz Lima", dataEvento: new Date("2026-11-08T12:00:00") };

describe("montarCorpoTermo · ministerio", () => {
  it("ingresso (sem origem): recebeu o ministério de X", () => {
    const t = montarCorpoTermo("ministerio", { ...ctxBase, ministerioNome: "Acólito" });
    expect(t).toContain("recebeu Beatriz Lima o ministério de Acólito");
    expect(t).toContain("conforme carta de designação do governo da comunidade");
    expect(t).not.toContain("passou");
  });

  it("mudança (com origem): passou do ministério de A ao ministério de B", () => {
    const t = montarCorpoTermo("ministerio", { ...ctxBase, ministerioNome: "Leitor", ministerioOrigem: "Acólito" });
    expect(t).toContain("passou Beatriz Lima do ministério de Acólito ao ministério de Leitor");
    expect(t).not.toContain("recebeu Beatriz Lima o ministério");
  });

  it("sem nome do ministério cai em marcador —", () => {
    const t = montarCorpoTermo("ministerio", { ...ctxBase });
    expect(t).toContain("o ministério de —");
  });
});
