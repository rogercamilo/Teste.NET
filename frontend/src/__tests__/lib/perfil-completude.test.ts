import { describe, it, expect } from "vitest";
import {
  camposFaltantes,
  perfilIncompleto,
  CAMPOS_COMPLETUDE,
} from "@/lib/perfil-completude";

const completo = {
  dataNascimento: "2000-01-01",
  telefone: "(11) 99999-9999",
  nacionalidade: "Brasileira",
  rg: "12.345.678-9",
  orgaoEmissor: "SSP/SP",
  cep: "01001-000",
};

describe("perfil-completude", () => {
  it("cadastro completo → nada falta", () => {
    expect(camposFaltantes(completo)).toEqual([]);
    expect(perfilIncompleto(completo)).toBe(false);
  });

  it("cadastro mínimo vazio → todos os campos faltam, na ordem", () => {
    expect(camposFaltantes({})).toEqual(CAMPOS_COMPLETUDE.map((c) => c.label));
    expect(perfilIncompleto({})).toBe(true);
  });

  it("trata null, undefined e string em branco como não preenchidos", () => {
    const d = { ...completo, rg: "  ", orgaoEmissor: null, cep: undefined };
    expect(camposFaltantes(d)).toEqual(["RG", "Órgão emissor", "CEP"]);
    expect(perfilIncompleto(d)).toBe(true);
  });

  it("estadoCivil/foto/nomeSocial não contam para completude", () => {
    // Campos fora do conjunto essencial não afetam o resultado.
    const d = { ...completo, estadoCivil: undefined, foto: null, nomeSocial: "" };
    expect(perfilIncompleto(d as never)).toBe(false);
  });
});
