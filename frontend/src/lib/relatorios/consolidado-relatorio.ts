/**
 * R3 — Consolidado por Morada (builder puro, testável).
 *
 * Uma linha por morada para a leitura de acompanhamento do Formador Geral/Fundador:
 * formador responsável, formandos ativos/total, presença média, nº em atenção
 * (risco) e cobertura do acompanhamento 1:1 (quantos em dia na cadência), além de
 * ter plano/grade. Reaproveita os motores `jornada-progresso` e `acompanhamento-
 * cadencia`; faz a redução por morada a partir das linhas por formando.
 */

import { type NivelFormativo, type ProgressoEtapa } from "@/types";
import { taxaPresenca90d, avaliarRiscoFormando } from "@/lib/jornada-progresso";
import { avaliarCadenciaAcompanhamento, normalizarCadencia } from "@/lib/acompanhamento-cadencia";

export interface MoradaMeta {
  id: string;
  nome: string;
  formadorNome?: string | null;
  temPlano: boolean;
  temGrade: boolean;
}

export interface FormandoConsolidado {
  id: string;
  moradaId: string | null;
  nivelFormativo: NivelFormativo;
  ativo: boolean;
  progressoEtapas?: ProgressoEtapa[];
}

export interface PresencaConsolidada {
  formandoId: string;
  data: string; // ISO
  presente: boolean;
  statusFormador?: string | null;
}

export interface LinhaMorada {
  id: string;
  nome: string;
  formadorNome: string | null;
  ativos: number;
  total: number;
  presencaMedia: number | null;
  emAtencao: number;
  coberturaEmDia: number;
  coberturaTotal: number;
  temPlano: boolean;
  temGrade: boolean;
}

export interface RelatorioConsolidado {
  cadenciaMeses: number;
  moradas: LinhaMorada[];
  totais: {
    moradas: number;
    ativos: number;
    total: number;
    presencaMedia: number | null;
    emAtencao: number;
    coberturaEmDia: number;
    coberturaTotal: number;
    semPlano: number;
    semGrade: number;
  };
}

export function montarRelatorioConsolidado(
  moradasMeta: MoradaMeta[],
  formandos: FormandoConsolidado[],
  presencas: PresencaConsolidada[],
  ultimoAcompanhamento: Map<string, Date | null>,
  cadenciaMesesRaw: number | null | undefined,
  hoje: Date = new Date(),
): RelatorioConsolidado {
  const cadenciaMeses = normalizarCadencia(cadenciaMesesRaw);

  // Agrupa formandos por morada (só ativos contam para as métricas de acompanhamento).
  const porMorada = new Map<string, FormandoConsolidado[]>();
  for (const f of formandos) {
    if (!f.moradaId) continue;
    const arr = porMorada.get(f.moradaId) ?? [];
    arr.push(f);
    porMorada.set(f.moradaId, arr);
  }

  const moradas: LinhaMorada[] = moradasMeta
    .map((m) => {
      const membros = porMorada.get(m.id) ?? [];
      const ativos = membros.filter((f) => f.ativo);

      const taxas: number[] = [];
      let emAtencao = 0;
      let coberturaEmDia = 0;
      for (const f of ativos) {
        const t = taxaPresenca90d(presencas, f.id, hoje);
        if (t !== null) taxas.push(t);

        const presDoFormando = presencas
          .filter((p) => p.formandoId === f.id)
          .map((p) => ({ formandoId: p.formandoId, data: p.data, presente: p.presente }));
        const risco = avaliarRiscoFormando(
          { nivelFormativo: f.nivelFormativo, progressoEtapas: f.progressoEtapas },
          presDoFormando,
          hoje,
          f.id,
        );
        if (risco.emRisco) emAtencao++;

        const cad = avaliarCadenciaAcompanhamento(cadenciaMeses, ultimoAcompanhamento.get(f.id) ?? null, hoje);
        if (!cad.precisaAcao) coberturaEmDia++; // em dia OU vence em breve = "em dia" para cobertura
      }

      const presencaMedia =
        taxas.length > 0 ? Math.round(taxas.reduce((s, t) => s + t, 0) / taxas.length) : null;

      return {
        id: m.id,
        nome: m.nome,
        formadorNome: m.formadorNome ?? null,
        ativos: ativos.length,
        total: membros.length,
        presencaMedia,
        emAtencao,
        coberturaEmDia,
        coberturaTotal: ativos.length,
        temPlano: m.temPlano,
        temGrade: m.temGrade,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const todasTaxas = moradas.map((m) => m.presencaMedia).filter((t): t is number => t !== null);
  const totais = {
    moradas: moradas.length,
    ativos: moradas.reduce((s, m) => s + m.ativos, 0),
    total: moradas.reduce((s, m) => s + m.total, 0),
    presencaMedia:
      todasTaxas.length > 0 ? Math.round(todasTaxas.reduce((s, t) => s + t, 0) / todasTaxas.length) : null,
    emAtencao: moradas.reduce((s, m) => s + m.emAtencao, 0),
    coberturaEmDia: moradas.reduce((s, m) => s + m.coberturaEmDia, 0),
    coberturaTotal: moradas.reduce((s, m) => s + m.coberturaTotal, 0),
    semPlano: moradas.filter((m) => !m.temPlano).length,
    semGrade: moradas.filter((m) => !m.temGrade).length,
  };

  return { cadenciaMeses, moradas, totais };
}
