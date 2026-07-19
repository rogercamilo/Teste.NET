import { describe, it, expect } from "vitest";
import {
  camposFaltantes,
  perfilIncompleto,
  CAMPOS_COMPLETUDE,
} from "@/lib/perfil-completude";

// Completude foca só nos essenciais de contato/identidade. Os campos canônicos
// (nacionalidade, RG, órgão emissor, CEP…) são opcionais — só exigidos, quando
// for o caso, nos documentos eclesiásticos — e não entram na completude.
const completo = {
  dataNascimento: "2000-01-01",
  telefone: "(11) 99999-9999",
};

describe("perfil-completude", () => {
  it("cadastro completo → nada falta", () => {
    expect(camposFaltantes(completo)).toEqual([]);
    expect(perfilIncompleto(completo)).toBe(false);
  });

  it("cadastro mínimo vazio → todos os campos faltam, na ordem", () => {
    expect(camposFaltantes({})).toEqual(CAMPOS_COMPLETUDE.map((c) => c.label));
    expect(camposFaltantes({})).toEqual(["Data de nascimento", "Telefone"]);
    expect(perfilIncompleto({})).toBe(true);
  });

  it("trata null, undefined e string em branco como não preenchidos", () => {
    const d = { dataNascimento: "  ", telefone: null };
    expect(camposFaltantes(d)).toEqual(["Data de nascimento", "Telefone"]);
    expect(perfilIncompleto(d)).toBe(true);
  });

  it("campos canônicos/opcionais NÃO contam para completude", () => {
    // nacionalidade/RG/CEP etc. fora do conjunto essencial não afetam o resultado.
    const d = { ...completo, nacionalidade: null, rg: "", cep: null };
    expect(perfilIncompleto(d as never)).toBe(false);
  });
});
