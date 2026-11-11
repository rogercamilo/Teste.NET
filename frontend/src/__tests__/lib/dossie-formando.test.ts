import { describe, it, expect } from "vitest";
import { montarDossieFormando, type MontarDossieArgs } from "@/lib/relatorios/dossie-formando";

const HOJE = new Date("2026-06-01T00:00:00Z");

function base(): MontarDossieArgs {
  return {
    formando: {
      id: "F1",
      nome: "Ana Beatriz Souza",
      nivelFormativo: "discipulado",
      dataNascimento: "1998-05-10",
      estadoCivil: "solteiro",
      foto: null,
      progressoEtapas: [
        {
          nivel: "discipulado",
          formacoesComunitariasRealizadas: 50,
          retirosComunitariosRealizados: 1,
          retirosPessoaisRealizados: 3,
          iniciouEm: "2026-01-01T00:00:00Z",
        },
      ],
    },
    presencas: [
      { formandoId: "F1", agendamentoId: "a1", data: "2026-03-01", presente: true, statusFormador: "presente", nivelFormativo: "discipulado" },
      { formandoId: "F1", agendamentoId: "a1", data: "2026-03-08", presente: false, statusFormador: "ausente", nivelFormativo: "discipulado" },
      { formandoId: "F1", agendamentoId: "a2", data: "2026-04-01", presente: true, statusFormador: "presente", nivelFormativo: "discipulado" },
      { formandoId: "F1", agendamentoId: "a3", data: "2026-05-01", presente: false, statusFormador: "justificado", nivelFormativo: "discipulado" },
      { formandoId: "F1", agendamentoId: "a3", data: "2026-05-08", presente: true, statusFormador: "presente", nivelFormativo: "discipulado" },
      // Fora da etapa — deve ser ignorada.
      { formandoId: "F1", agendamentoId: "a9", data: "2026-05-20", presente: false, statusFormador: "ausente", nivelFormativo: "pre-discipulado" },
    ],
    tipoEventoPorAgendamento: new Map([
      ["a1", "formacao"],
      ["a2", "retiro"],
      ["a3", "convocacao"],
      ["a9", "formacao"],
    ]),
    acompanhamentoDatas: ["2026-02-15", "2026-04-20", "2025-12-01" /* antes da etapa → ignorado */],
    eventos: [
      { tipo: "avaliacao-adesao", perspectiva: "humana", notaAdesao: "boa", criadoEm: "2026-02-01" },
      { tipo: "avaliacao-adesao", perspectiva: "humana", notaAdesao: "otima", criadoEm: "2026-05-01" },
      { tipo: "avaliacao-adesao", perspectiva: "espiritual", notaAdesao: "regular", criadoEm: "2026-04-01" },
      { tipo: "avaliacao-adesao", perspectiva: "comunitaria", notaAdesao: "boa", criadoEm: "2026-03-01" },
      { tipo: "licenca", dataInicioLicenca: "2026-01-10", dataFimLicenca: "2026-01-20", motivo: "Saúde", criadoEm: "2026-01-10" },
    ],
    evidenciasParecer: [
      { texto: "Cresce na vida de oração.", data: "2026-05-01" },
      { texto: "Precisa de constância.", data: "2026-04-01" },
    ],
    cadenciaMeses: 1,
    hoje: HOJE,
  };
}

describe("montarDossieFormando", () => {
  it("consolida presença total só da etapa (presente/ausente no denominador; justificado fora)", () => {
    const d = montarDossieFormando(base());
    // a1(presente), a1(ausente), a2(presente), a3(justificado→fora), a3(presente) = 4 total / 3 presentes
    expect(d.presencaTotal).toEqual({ presentes: 3, total: 4, pct: 75 });
  });

  it("quebra a presença por categoria de atividade", () => {
    const d = montarDossieFormando(base());
    const porChave = Object.fromEntries(d.presencaPorCategoria.map((c) => [c.chave, c]));
    expect(porChave.encontros).toMatchObject({ presentes: 1, total: 2, pct: 50 });
    expect(porChave.retiros_comunitarios).toMatchObject({ presentes: 1, total: 1, pct: 100 });
    expect(porChave.convocacoes).toMatchObject({ presentes: 1, total: 1, pct: 100 });
    // Retiros pessoais entram como contagem simples (realizados/requerido).
    expect(porChave.retiros_pessoais).toMatchObject({ presentes: 3, total: 8, contagemSimples: true });
  });

  it("traz requisitos por tipo e prontidão (incompleta)", () => {
    const d = montarDossieFormando(base());
    expect(d.requisitos.formacoesComunitarias).toEqual({ done: 50, req: 104 });
    expect(d.requisitos.retirosComunitarios).toEqual({ done: 1, req: 2 });
    expect(d.requisitos.retirosPessoais).toEqual({ done: 3, req: 8 });
    expect(d.prontoParaAvancar).toBe(false);
  });

  it("conta acompanhamento 1:1 só dentro da etapa", () => {
    const d = montarDossieFormando(base());
    expect(d.acompanhamento1a1.realizados).toBe(2);
  });

  it("lista licenças com período e dias", () => {
    const d = montarDossieFormando(base());
    expect(d.totalLicencas).toBe(1);
    expect(d.licencas[0]).toMatchObject({ inicio: "2026-01-10", fim: "2026-01-20", dias: 10, motivo: "Saúde" });
  });

  it("sugere a nota mais recente por perspectiva e consolida a fidelidade", () => {
    const d = montarDossieFormando(base());
    expect(d.perspectivasSugeridas.humana).toBe("otima");
    expect(d.perspectivasSugeridas.espiritual).toBe("regular");
    expect(d.fidelidade.banda).not.toBeNull();
    expect(d.fidelidade.avaliadas).toBe(3);
    expect(d.fidelidade.evidencias).toHaveLength(2);
  });

  it("identifica o formando (idade, estado civil)", () => {
    const d = montarDossieFormando(base());
    expect(d.identificacao.nome).toBe("Ana Beatriz Souza");
    expect(d.identificacao.idade).toBe(28);
    expect(d.identificacao.estadoCivilLabel).toBe("Solteiro(a)");
  });
});
