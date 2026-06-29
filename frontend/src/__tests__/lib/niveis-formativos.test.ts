/**
 * Invariantes do nível `vocacional` (backlog P1.4).
 *
 * O Período Vocacional é um nível selecionável em planos/grades, mas é
 * PRÉ-FORMATIVO: não participa da escada de promoção automática
 * (`SEQUENCIA_ETAPAS`). Estes testes travam essa fronteira para evitar que uma
 * futura mudança coloque o vocacional na progressão formal por engano.
 */
import { describe, it, expect } from "vitest";
import {
  SEQUENCIA_ETAPAS,
  NIVEIS_FORMATIVOS_SELECIONAVEIS,
  NIVEL_FORMATIVO_LABELS,
  REQUISITOS_ETAPAS,
  getProximaEtapa,
  totalRequerido,
} from "@/types";

describe("nível vocacional — fronteira com a escada formal", () => {
  it("é selecionável em planos/grades", () => {
    expect(NIVEIS_FORMATIVOS_SELECIONAVEIS).toContain("vocacional");
    expect(NIVEL_FORMATIVO_LABELS.vocacional).toBe("Período Vocacional");
  });

  it("NÃO faz parte da escada de promoção automática", () => {
    expect(SEQUENCIA_ETAPAS).not.toContain("vocacional");
  });

  it("não tem próxima etapa (fora da sequência → null)", () => {
    expect(getProximaEtapa("vocacional")).toBeNull();
  });

  it("não exige nada da formação comunitária (requisitos neutros)", () => {
    expect(REQUISITOS_ETAPAS.vocacional.formacoesComunitarias).toBe(0);
    expect(totalRequerido("vocacional")).toBe(0);
  });

  it("getProximaEtapa segue válido para os níveis formais", () => {
    expect(getProximaEtapa("pre-discipulado")).toBe("discipulado");
    expect(getProximaEtapa("formacao-permanente")).toBeNull();
  });
});
