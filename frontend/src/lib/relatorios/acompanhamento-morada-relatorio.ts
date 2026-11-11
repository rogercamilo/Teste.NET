/**
 * R1 — Acompanhamento da Morada (builder puro, testável).
 *
 * Reúne, por formando ativo, o que o Formador Comunitário precisa para acompanhar
 * sua morada: etapa, progresso na etapa, presença no período, situação (em atenção /
 * pronto para avançar / em dia), status do acompanhamento 1:1 (cadência do tenant) e
 * os pareceres por perspectiva (nota mais recente). Reaproveita os motores únicos
 * `jornada-progresso` e `acompanhamento-cadencia` — mesma régua do dashboard/ficha.
 */

import {
  REQUISITOS_ETAPAS,
  type NivelFormativo,
  type NotaAdesao,
  type PerspectivaFormativa,
  type ProgressoEtapa,
} from "@/types";
import {
  progressoNaEtapa,
  taxaPresenca90d,
  avaliarRiscoFormando,
  funilPorEtapa,
} from "@/lib/jornada-progresso";
import {
  avaliarCadenciaAcompanhamento,
  normalizarCadencia,
  type StatusCadencia,
} from "@/lib/acompanhamento-cadencia";
import type { SituacaoFormando } from "./tipos";

export type Pareceres = Partial<Record<PerspectivaFormativa, NotaAdesao>>;

export interface FormandoAcomp {
  id: string;
  nome: string;
  nivelFormativo: NivelFormativo;
  ativo: boolean;
  progressoEtapas?: ProgressoEtapa[];
}

export interface PresencaAcomp {
  formandoId: string;
  data: string; // ISO
  presente: boolean;
  statusFormador?: string | null;
}

export interface MembroAcompanhamento {
  nome: string;
  etapaLabel: string;
  progressoDone: number;
  progressoTotal: number;
  progressoPct: number;
  presenca: number | null;
  situacao: SituacaoFormando;
  motivos: string[];
  acompanhamentoStatus: StatusCadencia;
  diasAtraso: number;
  pareceres: Pareceres;
}

export interface FunilRel {
  etapaLabel: string;
  quantidade: number;
  percentual: number;
}

export interface RelatorioAcompanhamentoMorada {
  cadenciaMeses: number;
  resumo: {
    totalMembros: number;
    emAtencao: number;
    prontos: number;
    presencaMedia: number | null;
    semAcompanhamento: number; // nunca acompanhados 1:1
  };
  funil: FunilRel[];
  membros: MembroAcompanhamento[];
}

/** Verifica se o formando cumpriu os requisitos da etapa atual (mesma lógica de podeAvancarEtapa). */
export function prontoParaAvancar(nivel: NivelFormativo, progressoEtapas: ProgressoEtapa[] | undefined): boolean {
  if (nivel === "formacao-permanente") return false;
  const req = REQUISITOS_ETAPAS[nivel];
  const prog = (progressoEtapas ?? []).find((p) => p.nivel === nivel);
  if (!req || !prog) return false;
  return (
    prog.formacoesComunitariasRealizadas >= req.formacoesComunitarias &&
    prog.retirosComunitariosRealizados >= req.retirosComunitarios &&
    prog.retirosPessoaisRealizados >= req.retirosPessoais
  );
}

export function montarRelatorioAcompanhamentoMorada(
  formandos: FormandoAcomp[],
  presencas: PresencaAcomp[],
  ultimoAcompanhamento: Map<string, Date | null>,
  pareceres: Map<string, Pareceres>,
  cadenciaMesesRaw: number | null | undefined,
  etapaLabel: (n: NivelFormativo) => string,
  hoje: Date = new Date(),
): RelatorioAcompanhamentoMorada {
  const cadenciaMeses = normalizarCadencia(cadenciaMesesRaw);
  const ativos = formandos.filter((f) => f.ativo);

  const funil: FunilRel[] = funilPorEtapa(formandos).map((f) => ({
    etapaLabel: etapaLabel(f.nivel),
    quantidade: f.quantidade,
    percentual: f.percentual,
  }));

  const membros: MembroAcompanhamento[] = ativos
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((f) => {
      const prog = progressoNaEtapa(f.nivelFormativo, f.progressoEtapas);
      const presenca = taxaPresenca90d(presencas, f.id, hoje);
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

      const cad = avaliarCadenciaAcompanhamento(cadenciaMeses, ultimoAcompanhamento.get(f.id) ?? null, hoje);

      return {
        nome: f.nome,
        etapaLabel: etapaLabel(f.nivelFormativo),
        progressoDone: prog.done,
        progressoTotal: prog.total,
        progressoPct: prog.pct,
        presenca,
        situacao,
        motivos: risco.motivos,
        acompanhamentoStatus: cad.status,
        diasAtraso: cad.diasAtraso,
        pareceres: pareceres.get(f.id) ?? {},
      };
    });

  const comPresenca = membros.map((m) => m.presenca).filter((p): p is number => p !== null);
  const presencaMedia =
    comPresenca.length > 0
      ? Math.round(comPresenca.reduce((s, p) => s + p, 0) / comPresenca.length)
      : null;

  return {
    cadenciaMeses,
    resumo: {
      totalMembros: ativos.length,
      emAtencao: membros.filter((m) => m.situacao === "risco").length,
      prontos: membros.filter((m) => m.situacao === "pronto").length,
      presencaMedia,
      semAcompanhamento: membros.filter((m) => m.acompanhamentoStatus === "nunca").length,
    },
    funil,
    membros,
  };
}
