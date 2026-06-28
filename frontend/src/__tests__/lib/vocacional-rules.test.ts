import { describe, it, expect } from "vitest";
import {
  validarElegibilidadeVocacional,
  podeVerAcompanhamento,
  participacaoEncerrada,
  cartaPermitida,
  motivoTermino,
  CONDICOES_FORMAIS,
} from "@/lib/vocacional-rules";

describe("validarElegibilidadeVocacional", () => {
  it("aceita formando sem condição (não formal)", () => {
    expect(validarElegibilidadeVocacional({ condicaoAtual: null, temParticipacaoEmAndamento: false }).ok).toBe(true);
  });

  it("aceita candidato", () => {
    expect(validarElegibilidadeVocacional({ condicaoAtual: "candidato", temParticipacaoEmAndamento: false }).ok).toBe(true);
  });

  it("recusa todos os membros formais (preserva condição canônica)", () => {
    for (const c of CONDICOES_FORMAIS) {
      const r = validarElegibilidadeVocacional({ condicaoAtual: c, temParticipacaoEmAndamento: false });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toMatch(/membro/i);
    }
  });

  it("recusa quem já tem participação em andamento (mesmo elegível por condição)", () => {
    const r = validarElegibilidadeVocacional({ condicaoAtual: "candidato", temParticipacaoEmAndamento: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/andamento/i);
  });

  it("a participação em andamento tem precedência sobre a checagem de condição", () => {
    const r = validarElegibilidadeVocacional({ condicaoAtual: "membro_consagrado", temParticipacaoEmAndamento: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/andamento/i);
  });
});

describe("podeVerAcompanhamento (foro íntimo)", () => {
  const ctx = { acompanhadorId: "acomp-1", turmaFormadorId: "form-1" };

  it("administrador e formador_geral sempre veem", () => {
    expect(podeVerAcompanhamento({ id: "x", role: "administrador" }, ctx)).toBe(true);
    expect(podeVerAcompanhamento({ id: "y", role: "formador_geral" }, ctx)).toBe(true);
  });

  it("o acompanhador designado vê, mesmo sendo formador_comunitario", () => {
    expect(podeVerAcompanhamento({ id: "acomp-1", role: "formador_comunitario" }, ctx)).toBe(true);
  });

  it("o formador da turma vê", () => {
    expect(podeVerAcompanhamento({ id: "form-1", role: "formador_comunitario" }, ctx)).toBe(true);
  });

  it("um formador_comunitario alheio NÃO vê", () => {
    expect(podeVerAcompanhamento({ id: "outro", role: "formador_comunitario" }, ctx)).toBe(false);
  });

  it("sem id e sem papel suficiente NÃO vê", () => {
    expect(podeVerAcompanhamento({ id: null, role: "formador_comunitario" }, ctx)).toBe(false);
  });
});

describe("estados terminais e carta", () => {
  it("estados terminais são imutáveis", () => {
    for (const s of ["concluida_deferida", "recusada_arquivada", "indeferida_arquivada", "cancelada"]) {
      expect(participacaoEncerrada(s)).toBe(true);
    }
  });

  it("estados em curso não são terminais", () => {
    for (const s of ["ativa", "aguardando_carta", "em_discernimento"]) {
      expect(participacaoEncerrada(s)).toBe(false);
    }
  });

  it("carta só é permitida em estados não encerrados", () => {
    expect(cartaPermitida("ativa")).toBe(true);
    expect(cartaPermitida("em_discernimento")).toBe(true);
    expect(cartaPermitida("concluida_deferida")).toBe(false);
    expect(cartaPermitida("cancelada")).toBe(false);
  });
});

describe("motivoTermino", () => {
  it("mapeia desfechos para texto cartorial", () => {
    expect(motivoTermino("concluida_deferida")).toMatch(/deferimento/);
    expect(motivoTermino("recusada_arquivada")).toMatch(/recusa/);
    expect(motivoTermino("indeferida_arquivada")).toMatch(/indeferimento/);
  });

  it("retorna vazio para status sem mapeamento (ex.: cancelada usa retificação)", () => {
    expect(motivoTermino("cancelada")).toBe("");
  });
});
