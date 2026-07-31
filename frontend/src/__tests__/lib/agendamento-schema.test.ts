import { describe, it, expect } from "vitest";
import { CreateAgendamentoSchema } from "@/lib/schemas";

const base = { dataInicio: "2026-07-10T19:00:00.000Z" };

describe("CreateAgendamentoSchema — tipos de evento", () => {
  it("formação (default) exige formacaoId", () => {
    expect(CreateAgendamentoSchema.safeParse({ ...base }).success).toBe(false);
    expect(
      CreateAgendamentoSchema.safeParse({ ...base, formacaoId: "cl_f1" }).success
    ).toBe(true);
  });

  it("evento avulso (retiro/convocação/reunião/outro) exige título, não formação", () => {
    // sem título → inválido
    expect(
      CreateAgendamentoSchema.safeParse({ ...base, tipoEvento: "retiro" }).success
    ).toBe(false);
    // com título → válido, sem precisar de formacaoId
    for (const tipoEvento of ["retiro", "convocacao", "reuniao", "outro"] as const) {
      const r = CreateAgendamentoSchema.safeParse({
        ...base,
        tipoEvento,
        formacaoTema: "Retiro de Advento",
      });
      expect(r.success, tipoEvento).toBe(true);
    }
  });

  it("aceita grupos-alvo (multi) e tipoEvento juntos", () => {
    const r = CreateAgendamentoSchema.safeParse({
      ...base,
      tipoEvento: "convocacao",
      formacaoTema: "Convocação Geral",
      grupoFormacaoIds: ["g1", "g2"],
    });
    expect(r.success).toBe(true);
  });

  it("rejeita tipoEvento inválido", () => {
    const r = CreateAgendamentoSchema.safeParse({ ...base, tipoEvento: "festa", formacaoTema: "x" });
    expect(r.success).toBe(false);
  });
});

describe("CreateAgendamentoSchema — acompanhamento comunitário", () => {
  it("exige exatamente um alvo (formando XOR usuário)", () => {
    // sem alvo → inválido
    expect(
      CreateAgendamentoSchema.safeParse({ ...base, tipoEvento: "acompanhamento_comunitario" }).success
    ).toBe(false);
    // dois alvos → inválido
    expect(
      CreateAgendamentoSchema.safeParse({
        ...base,
        tipoEvento: "acompanhamento_comunitario",
        acompanhadoFormandoId: "fmd_1",
        acompanhadoUsuarioId: "usr_1",
      }).success
    ).toBe(false);
  });

  it("aceita alvo formando (fluxo FC) sem exigir formação/título", () => {
    const r = CreateAgendamentoSchema.safeParse({
      ...base,
      tipoEvento: "acompanhamento_comunitario",
      acompanhadoFormandoId: "fmd_1",
    });
    expect(r.success).toBe(true);
  });

  it("aceita alvo usuário-formador (fluxo FG)", () => {
    const r = CreateAgendamentoSchema.safeParse({
      ...base,
      tipoEvento: "acompanhamento_comunitario",
      acompanhadoUsuarioId: "usr_1",
    });
    expect(r.success).toBe(true);
  });
});
