/**
 * Relatório do grupo para coordenação (item 3.2) — builder puro e testável.
 *
 * Reaproveita o MESMO motor da aba Jornada (3.1) / alertas de risco (3.3):
 * `progressoNaEtapa`, `funilPorEtapa`, `taxaPresenca90d`, `avaliarRiscoFormando`.
 * Consumido pela rota de export (PDF/CSV); não renderiza nada.
 */

import type { NivelFormativo, ProgressoEtapa } from "@/types";
import {
  progressoNaEtapa,
  funilPorEtapa,
  taxaPresenca90d,
  avaliarRiscoFormando,
} from "@/lib/jornada-progresso";

export interface FormandoRel {
  id: string;
  nome: string;
  nivelFormativo: NivelFormativo;
  ativo: boolean;
  progressoEtapas?: ProgressoEtapa[];
}

export interface PresencaRel {
  formandoId: string;
  data: string; // ISO
  presente: boolean;
}

export interface MembroRelatorio {
  nome: string;
  etapaLabel: string;
  progressoDone: number;
  progressoTotal: number;
  progressoPct: number;
  presenca: number | null; // % em 90d, null se sem registros
  emRisco: boolean;
  motivos: string[];
}

export interface FunilRelatorio {
  etapaLabel: string;
  quantidade: number;
  percentual: number;
}

export interface GrupoRelatorio {
  totalMembros: number; // ativos considerados
  emRisco: number;
  presencaMedia: number | null; // média das taxas dos membros com registro
  funil: FunilRelatorio[];
  membros: MembroRelatorio[];
}

export function montarRelatorioGrupo(
  formandos: FormandoRel[],
  presencas: PresencaRel[],
  etapaLabel: (n: NivelFormativo) => string,
  hoje: Date = new Date()
): GrupoRelatorio {
  const ativos = formandos.filter((f) => f.ativo);

  const funil: FunilRelatorio[] = funilPorEtapa(formandos).map((f) => ({
    etapaLabel: etapaLabel(f.nivel),
    quantidade: f.quantidade,
    percentual: f.percentual,
  }));

  const membros: MembroRelatorio[] = ativos
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((f) => {
      const prog = progressoNaEtapa(f.nivelFormativo, f.progressoEtapas);
      const presenca = taxaPresenca90d(presencas, f.id, hoje);
      const risco = avaliarRiscoFormando(f, presencas, hoje, f.id);
      return {
        nome: f.nome,
        etapaLabel: etapaLabel(f.nivelFormativo),
        progressoDone: prog.done,
        progressoTotal: prog.total,
        progressoPct: prog.pct,
        presenca,
        emRisco: risco.emRisco,
        motivos: risco.motivos,
      };
    });

  const comPresenca = membros.map((m) => m.presenca).filter((p): p is number => p !== null);
  const presencaMedia =
    comPresenca.length > 0
      ? Math.round(comPresenca.reduce((s, p) => s + p, 0) / comPresenca.length)
      : null;

  return {
    totalMembros: ativos.length,
    emRisco: membros.filter((m) => m.emRisco).length,
    presencaMedia,
    funil,
    membros,
  };
}
