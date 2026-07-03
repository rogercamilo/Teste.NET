import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/relatorios/csv";
import {
  montarRelatorioGrupo,
  type FormandoRel,
  type PresencaRel,
} from "@/lib/relatorios/grupo-relatorio";

describe("toCsv", () => {
  it("usa ; como separador, prefixa BOM e escapa separador/aspas/quebra", () => {
    const csv = toCsv(["A", "B"], [["x", "com;ponto"], ['as"pas', "linha\nquebra"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    const linhas = csv.slice(1).split("\r\n");
    expect(linhas[0]).toBe("A;B");
    expect(linhas[1]).toBe('x;"com;ponto"');
    expect(linhas[2]).toBe('"as""pas";"linha\nquebra"');
  });

  it("null/undefined viram célula vazia", () => {
    const csv = toCsv(["A", "B"], [[null, undefined]]);
    expect(csv.slice(1).split("\r\n")[1]).toBe(";");
  });
});

describe("montarRelatorioGrupo", () => {
  const hoje = new Date("2026-07-01T12:00:00Z");
  const diasAtras = (d: number) => new Date(hoje.getTime() - d * 86_400_000).toISOString();

  it("conta só ativos, monta funil e sinaliza risco por presença baixa", () => {
    const formandos: FormandoRel[] = [
      { id: "a", nome: "Ana", nivelFormativo: "discipulado", ativo: true, progressoEtapas: [] },
      { id: "b", nome: "Bruno", nivelFormativo: "pre-discipulado", ativo: true, progressoEtapas: [] },
      { id: "c", nome: "Carla", nivelFormativo: "discipulado", ativo: false, progressoEtapas: [] },
    ];
    const presencas: PresencaRel[] = [
      { formandoId: "a", data: diasAtras(10), presente: true },
      { formandoId: "a", data: diasAtras(20), presente: true },
      { formandoId: "b", data: diasAtras(10), presente: false },
      { formandoId: "b", data: diasAtras(20), presente: false },
      { formandoId: "b", data: diasAtras(30), presente: true },
    ];

    const r = montarRelatorioGrupo(formandos, presencas, (n) => n, hoje);

    expect(r.totalMembros).toBe(2);
    expect(r.membros.map((m) => m.nome)).toEqual(["Ana", "Bruno"]);
    expect(r.funil.find((f) => f.etapaLabel === "discipulado")?.quantidade).toBe(1);

    const ana = r.membros.find((m) => m.nome === "Ana")!;
    const bruno = r.membros.find((m) => m.nome === "Bruno")!;
    expect(ana.presenca).toBe(100);
    expect(ana.emRisco).toBe(false);
    expect(bruno.presenca).toBe(33);
    expect(bruno.emRisco).toBe(true);
    expect(bruno.motivos.join(" ")).toContain("presença");

    expect(r.emRisco).toBe(1);
    expect(r.presencaMedia).toBe(67); // (100 + 33) / 2 arredondado
  });
});
