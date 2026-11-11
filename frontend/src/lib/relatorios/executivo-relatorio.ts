/**
 * R6 — Relatório Executivo (builder puro, testável).
 *
 * Leitura macro para o Fundador/Admin: crescimento (ingressos por mês), retenção
 * (ativos sobre total), presença global no período, progresso médio da jornada e
 * tamanho da estrutura (moradas/formadores). Mesma régua de `jornada-progresso`.
 * Espelha o delta `executivo` do dashboard, aqui como relatório consultável/exportável.
 */

import { format } from "date-fns";
import { type NivelFormativo, type ProgressoEtapa } from "@/types";
import { progressoNaEtapa } from "@/lib/jornada-progresso";

export interface MesRef {
  yearMonth: string; // "yyyy-MM"
  label: string;
}

export interface PresencaMoradaAgg {
  total: number;
  presentes: number;
}

export interface PresencaMoradaMes {
  ym: string; // "yyyy-MM"
  total: number;
  presentes: number;
}

export interface FormandoExecutivo {
  nivelFormativo: NivelFormativo;
  progressoEtapas?: ProgressoEtapa[];
}

export interface EntradaExecutivo {
  ingressos: Date[];
  totalFormandos: number;
  formandosAtivos: number;
  inativos: number;
  presencaPorMorada: PresencaMoradaAgg[];
  presencaPorMoradaMes: PresencaMoradaMes[];
  formandosJornada: FormandoExecutivo[];
  totalMoradas: number;
  totalFormadores: number;
  months: MesRef[];
}

export interface RelatorioExecutivo {
  retencaoPct: number;
  inativos: number;
  totalFormandos: number;
  formandosAtivos: number;
  taxaPresencaGlobal: number | null;
  progressoMedioJornada: number;
  totalMoradas: number;
  totalFormadores: number;
  crescimentoMensal: { mes: string; novos: number }[];
  presencaTendencia: { mes: string; taxa: number | null }[];
}

export function montarRelatorioExecutivo(e: EntradaExecutivo): RelatorioExecutivo {
  // Crescimento: ingressos por mês (mesma janela/rótulos do dashboard).
  const cresc: Record<string, number> = {};
  for (const { yearMonth } of e.months) cresc[yearMonth] = 0;
  for (const d of e.ingressos) {
    const ym = format(d, "yyyy-MM");
    if (cresc[ym] !== undefined) cresc[ym]++;
  }
  const crescimentoMensal = e.months.map(({ yearMonth, label }) => ({ mes: label, novos: cresc[yearMonth] }));

  const retencaoPct = e.totalFormandos > 0 ? Math.round((e.formandosAtivos / e.totalFormandos) * 100) : 0;

  // Presença global = soma das agregações por morada no período.
  let gTot = 0;
  let gPres = 0;
  for (const r of e.presencaPorMorada) {
    gTot += r.total;
    gPres += r.presentes;
  }
  const taxaPresencaGlobal = gTot > 0 ? Math.round((gPres / gTot) * 100) : null;

  // Tendência mensal (org inteira).
  const tend: Record<string, { total: number; pres: number }> = {};
  for (const { yearMonth } of e.months) tend[yearMonth] = { total: 0, pres: 0 };
  for (const r of e.presencaPorMoradaMes) {
    const b = tend[r.ym];
    if (b) {
      b.total += r.total;
      b.pres += r.presentes;
    }
  }
  const presencaTendencia = e.months.map(({ yearMonth, label }) => {
    const b = tend[yearMonth];
    return { mes: label, taxa: b.total > 0 ? Math.round((b.pres / b.total) * 100) : null };
  });

  // Progresso médio da jornada (mesma régua de lib/jornada-progresso).
  let soma = 0;
  for (const f of e.formandosJornada) {
    soma += progressoNaEtapa(f.nivelFormativo, f.progressoEtapas).pct;
  }
  const progressoMedioJornada = e.formandosJornada.length ? Math.round(soma / e.formandosJornada.length) : 0;

  return {
    retencaoPct,
    inativos: e.inativos,
    totalFormandos: e.totalFormandos,
    formandosAtivos: e.formandosAtivos,
    taxaPresencaGlobal,
    progressoMedioJornada,
    totalMoradas: e.totalMoradas,
    totalFormadores: e.totalFormadores,
    crescimentoMensal,
    presencaTendencia,
  };
}
