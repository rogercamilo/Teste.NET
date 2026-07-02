import { describe, it, expect } from "vitest";
import { CreateCompromissoSchema, UpdateCompromissoSchema } from "@/lib/schemas";

const valido = {
  titulo: "Reunião de equipe",
  tipo: "reuniao",
  dataInicio: "2026-07-10T19:00:00.000Z",
};

describe("CreateCompromissoSchema", () => {
  it("aceita um compromisso válido mínimo", () => {
    const r = CreateCompromissoSchema.safeParse(valido);
    expect(r.success).toBe(true);
  });

  it("aceita vínculo opcional a formando e campos extras", () => {
    const r = CreateCompromissoSchema.safeParse({
      ...valido,
      tipo: "visita",
      descricao: "Visita pastoral",
      local: "Casa da família",
      formandoId: "cl_form1",
      dataFim: "2026-07-10T20:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });

  it("rejeita tipo inválido", () => {
    const r = CreateCompromissoSchema.safeParse({ ...valido, tipo: "individual" });
    expect(r.success).toBe(false);
  });

  it("exige título não vazio", () => {
    const r = CreateCompromissoSchema.safeParse({ ...valido, titulo: "   " });
    expect(r.success).toBe(false);
  });

  it("rejeita linkOnline inválido", () => {
    const r = CreateCompromissoSchema.safeParse({ ...valido, linkOnline: "não-é-url" });
    expect(r.success).toBe(false);
  });
});

describe("UpdateCompromissoSchema", () => {
  it("permite atualização parcial (só o título)", () => {
    const r = UpdateCompromissoSchema.safeParse({ titulo: "Novo título" });
    expect(r.success).toBe(true);
  });
});
