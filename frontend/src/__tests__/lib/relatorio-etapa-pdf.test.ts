import { describe, it, expect } from "vitest";
import { montarDossieFormando } from "@/lib/relatorios/dossie-formando";
import { renderRelatorioEtapaPdf } from "@/lib/relatorios/relatorio-etapa-pdf";
import { renderIdentificacaoVisualPdf } from "@/lib/relatorios/identificacao-visual-pdf";

function dossieExemplo() {
  return montarDossieFormando({
    formando: {
      id: "F1", nome: "Ana Beatriz Souza", nivelFormativo: "discipulado",
      dataNascimento: "1998-05-10", estadoCivil: "solteiro", foto: null,
      progressoEtapas: [{ nivel: "discipulado", formacoesComunitariasRealizadas: 50, retirosComunitariosRealizados: 1, retirosPessoaisRealizados: 3, iniciouEm: "2026-01-01T00:00:00Z" }],
    },
    presencas: [
      { formandoId: "F1", agendamentoId: "a1", data: "2026-03-01", presente: true, statusFormador: "presente", nivelFormativo: "discipulado" },
      { formandoId: "F1", agendamentoId: "a2", data: "2026-04-01", presente: true, statusFormador: "presente", nivelFormativo: "discipulado" },
    ],
    tipoEventoPorAgendamento: new Map([["a1", "formacao"], ["a2", "retiro"]]),
    acompanhamentoDatas: ["2026-02-15"],
    eventos: [
      { tipo: "avaliacao-adesao", perspectiva: "humana", notaAdesao: "otima", criadoEm: "2026-05-01" },
      { tipo: "licenca", dataInicioLicenca: "2026-01-10", dataFimLicenca: "2026-01-20", motivo: "Saúde", criadoEm: "2026-01-10" },
    ],
    evidenciasParecer: [{ texto: "Cresce na vida de oração.", data: "2026-05-01" }],
    cadenciaMeses: 1,
    hoje: new Date("2026-06-01T00:00:00Z"),
  });
}

describe("PDFs do Relatório de Etapa", () => {
  it("renderiza o dossiê sem quebrar (PDF válido, sem foto → iniciais)", async () => {
    const buf = await renderRelatorioEtapaPdf({
      orgNome: "Comunidade Demonstração", grupoNome: "Morada São José", formadorNome: "Pe. João",
      geradoEm: "01/06/2026", dataLonga: "01 de junho de 2026", etapaLabel: "Discipulado",
      dossie: dossieExemplo(),
      relatorio: {
        avaliacaoHumana: "otima", avaliacaoEspiritual: "regular", avaliacaoComunitaria: "boa",
        textoNarrativo: "Caminha bem.", pontosForteza: "Oração.", desafios: "Constância.",
        recomendacao: "avanca", textoRecomendacao: "Apto.", autorNome: "Pe. João", finalizadoEm: "01 de junho de 2026",
      },
      fotoDataUrl: null,
    });
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("renderiza a identificação visual sem quebrar", async () => {
    const buf = await renderIdentificacaoVisualPdf({
      orgNome: "Comunidade Demonstração", grupoNome: "Morada São José", etapaLabel: "Discipulado",
      geradoEm: "01/06/2026", dataLonga: "01 de junho de 2026",
      nome: "Ana Beatriz Souza", idade: 28, estadoCivilLabel: "Solteiro(a)", fotoDataUrl: null,
    });
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
