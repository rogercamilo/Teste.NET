import { describe, it, expect } from "vitest";
import { construirSankeyJornada } from "@/lib/jornada-sankey";
import { NIVEL_FORMATIVO_LABELS as L } from "@/types";

const VOC = "Vocacional";
const val = (r: { links: { source: string; target: string; value: number }[] }, s: string, t: string) =>
  r.links.find((l) => l.source === s && l.target === t)?.value;

describe("construirSankeyJornada", () => {
  it("progressão linear gera ingresso + transições canônicas", () => {
    const r = construirSankeyJornada(
      [
        { formandoId: "f1", nivelFormativo: "pre-discipulado" },
        { formandoId: "f1", nivelFormativo: "discipulado" },
        { formandoId: "f1", nivelFormativo: "primeiras-promessas" },
      ],
      [],
      VOC,
    )!;
    expect(r.links).toHaveLength(3);
    expect(val(r, "Ingresso", L["pre-discipulado"])).toBe(1);
    expect(val(r, L["pre-discipulado"], L["discipulado"])).toBe(1);
    expect(val(r, L["discipulado"], L["primeiras-promessas"])).toBe(1);
    // nenhum self-loop
    expect(r.links.every((l) => l.source !== l.target)).toBe(true);
  });

  it("ordem canônica independe da ordem de entrada das linhas (sem ciclo)", () => {
    const r = construirSankeyJornada(
      [
        { formandoId: "f1", nivelFormativo: "discipulado" },
        { formandoId: "f1", nivelFormativo: "pre-discipulado" }, // fora de ordem de propósito
      ],
      [],
      VOC,
    )!;
    expect(val(r, L["pre-discipulado"], L["discipulado"])).toBe(1);
    // não existe aresta "para trás"
    expect(val(r, L["discipulado"], L["pre-discipulado"])).toBeUndefined();
  });

  it("agrega a mesma transição de múltiplos formandos", () => {
    const r = construirSankeyJornada(
      [
        { formandoId: "f1", nivelFormativo: "pre-discipulado" },
        { formandoId: "f1", nivelFormativo: "discipulado" },
        { formandoId: "f2", nivelFormativo: "pre-discipulado" },
        { formandoId: "f2", nivelFormativo: "discipulado" },
      ],
      [],
      VOC,
    )!;
    expect(val(r, L["pre-discipulado"], L["discipulado"])).toBe(2);
    expect(val(r, "Ingresso", L["pre-discipulado"])).toBe(2);
  });

  it("ramo vocacional: origem = etapa mais avançada, desfecho deferido", () => {
    const r = construirSankeyJornada(
      [{ formandoId: "f1", nivelFormativo: "discipulado" }],
      [{ formandoId: "f1", status: "concluida_deferida" }],
      VOC,
    )!;
    expect(val(r, L["discipulado"], VOC)).toBe(1);
    expect(val(r, VOC, "Concluído")).toBe(1);
  });

  it("saída vocacional (cancelada) vira Arquivado; status ativo não gera desfecho", () => {
    const cancelada = construirSankeyJornada(
      [],
      [{ formandoId: "f1", status: "cancelada" }],
      VOC,
    )!;
    expect(val(cancelada, "Ingresso", VOC)).toBe(1);
    expect(val(cancelada, VOC, "Arquivado / saída")).toBe(1);

    const ativa = construirSankeyJornada([], [{ formandoId: "f1", status: "ativa" }], VOC)!;
    expect(val(ativa, "Ingresso", VOC)).toBe(1);
    expect(ativa.links.some((l) => l.source === VOC)).toBe(false); // ainda no nó vocacional
  });

  it("sem dados retorna undefined; incluirIngresso:false omite o nó Ingresso", () => {
    expect(construirSankeyJornada([], [], VOC)).toBeUndefined();
    const semIngresso = construirSankeyJornada(
      [
        { formandoId: "f1", nivelFormativo: "pre-discipulado" },
        { formandoId: "f1", nivelFormativo: "discipulado" },
      ],
      [],
      VOC,
      { incluirIngresso: false },
    )!;
    expect(semIngresso.links.some((l) => l.source === "Ingresso")).toBe(false);
    expect(val(semIngresso, L["pre-discipulado"], L["discipulado"])).toBe(1);
  });
});
