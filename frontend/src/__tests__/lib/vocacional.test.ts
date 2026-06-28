import { describe, it, expect } from "vitest";
import { montarCorpoTermo, condicaoPorTipoTermo, parseDataLocal } from "@/lib/livro-registro";
import { hasVocacionalAccess, hasCanonicalAccess } from "@/types";

const DATA = parseDataLocal("2026-03-15");

describe("Livro — termos vocacionais", () => {
  it("ingresso_vocacional fixa a condição de candidato", () => {
    expect(condicaoPorTipoTermo("ingresso_vocacional")).toBe("candidato");
  });

  it("termino_vocacional não altera a condição", () => {
    expect(condicaoPorTipoTermo("termino_vocacional")).toBeUndefined();
  });

  it("corpo do termo de ingresso cita o nome e o período vocacional", () => {
    const corpo = montarCorpoTermo("ingresso_vocacional", {
      formandoNome: "Maria das Dores",
      dataEvento: DATA,
      condicaoResultante: "candidato",
    });
    expect(corpo).toContain("Maria das Dores");
    expect(corpo).toContain("Período Vocacional");
    expect(corpo).toContain("condição de Candidato");
  });

  it("corpo do termo de término incorpora o motivo do desfecho", () => {
    const corpo = montarCorpoTermo("termino_vocacional", {
      formandoNome: "João",
      dataEvento: DATA,
      motivo: "por recusa do(a) candidato(a) em prosseguir",
    });
    expect(corpo).toContain("encerra-se a participação de João");
    expect(corpo).toContain("por recusa");
  });
});

describe("hasVocacionalAccess", () => {
  it("libera para orgs canônicas independentemente do flag", () => {
    expect(hasVocacionalAccess("nova_comunidade", false)).toBe(true);
    expect(hasVocacionalAccess("instituto_religioso", false)).toBe(true);
  });

  it("libera grupo de oração apenas quando o flag está ligado", () => {
    expect(hasVocacionalAccess("grupo_oracao", false)).toBe(false);
    expect(hasVocacionalAccess("grupo_oracao", true)).toBe(true);
  });

  it("não confunde com hasCanonicalAccess (que ignora o flag)", () => {
    expect(hasCanonicalAccess("grupo_oracao")).toBe(false);
  });
});
