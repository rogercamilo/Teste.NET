/**
 * R4 — Jornada Formativa da Comunidade (builder puro, testável).
 *
 * A jornada inteira da comunidade: distribuição dos formandos ativos por etapa
 * (funil), quantos estão prontos para avançar e quantos em atenção (risco), com a
 * lista por formando indicando a morada. Reaproveita `jornada-progresso` e o helper
 * `prontoParaAvancar` do relatório de morada — fonte única da régua de progresso.
 */

import { type NivelFormativo, type ProgressoEtapa } from "@/types";
import { funilPorEtapa, progressoNaEtapa, avaliarRiscoFormando } from "@/lib/jornada-progresso";
import { prontoParaAvancar } from "./acompanhamento-morada-relatorio";
import type { SituacaoFormando } from "./tipos";

export interface FormandoJornada {
  id: string;
  nome: string;
  moradaNome: string | null;
  nivelFormativo: NivelFormativo;
  ativo: boolean;
  progressoEtapas?: ProgressoEtapa[];
}

export interface PresencaJornada {
  formandoId: string;
  data: string; // ISO
  presente: boolean;
  statusFormador?: string | null;
}

export interface FunilRelJornada {
  etapaLabel: string;
  quantidade: number;
  percentual: number;
}

export interface MembroJornada {
  nome: string;
  moradaNome: string;
  etapaLabel: string;
  progressoPct: number;
  situacao: SituacaoFormando;
  motivos: string[];
}

export interface RelatorioJornada {
  resumo: {
    totalAtivos: number;
    prontos: number;
    emAtencao: number;
  };
  funil: FunilRelJornada[];
  membros: MembroJornada[];
}

export function montarRelatorioJornada(
  formandos: FormandoJornada[],
  presencas: PresencaJornada[],
  etapaLabel: (n: NivelFormativo) => string,
  hoje: Date = new Date(),
): RelatorioJornada {
  const ativos = formandos.filter((f) => f.ativo);

  const funil: FunilRelJornada[] = funilPorEtapa(formandos).map((f) => ({
    etapaLabel: etapaLabel(f.nivel),
    quantidade: f.quantidade,
    percentual: f.percentual,
  }));

  const membros: MembroJornada[] = ativos
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((f) => {
      const prog = progressoNaEtapa(f.nivelFormativo, f.progressoEtapas);
      const presDoFormando = presencas
        .filter((p) => p.formandoId === f.id)
        .map((p) => ({ formandoId: p.formandoId, data: p.data, presente: p.presente }));
      const risco = avaliarRiscoFormando(
        { nivelFormativo: f.nivelFormativo, progressoEtapas: f.progressoEtapas },
        presDoFormando,
        hoje,
        f.id,
      );
      const pronto = prontoParaAvancar(f.nivelFormativo, f.progressoEtapas);
      const situacao: SituacaoFormando = risco.emRisco ? "risco" : pronto ? "pronto" : "em_dia";
      return {
        nome: f.nome,
        moradaNome: f.moradaNome ?? "—",
        etapaLabel: etapaLabel(f.nivelFormativo),
        progressoPct: prog.pct,
        situacao,
        motivos: risco.motivos,
      };
    });

  return {
    resumo: {
      totalAtivos: ativos.length,
      prontos: membros.filter((m) => m.situacao === "pronto").length,
      emAtencao: membros.filter((m) => m.situacao === "risco").length,
    },
    funil,
    membros,
  };
}
