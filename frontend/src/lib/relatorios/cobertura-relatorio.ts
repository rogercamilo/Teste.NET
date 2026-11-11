/**
 * R5 — Cobertura de Acompanhamento 1:1 (builder puro, testável).
 *
 * Por morada: quantos formandos ativos estão em dia, vencendo em breve, atrasados
 * ou nunca acompanhados na cadência do tenant. Lista também os pendentes (atrasado
 * ou nunca) para ação. Fonte única: `acompanhamento-cadencia`.
 */

import {
  avaliarCadenciaAcompanhamento,
  normalizarCadencia,
  type StatusCadencia,
} from "@/lib/acompanhamento-cadencia";

export interface MoradaMetaCobertura {
  id: string;
  nome: string;
  formadorNome?: string | null;
}

export interface FormandoCobertura {
  id: string;
  nome: string;
  moradaId: string | null;
  ativo: boolean;
}

export interface LinhaCobertura {
  id: string;
  nome: string;
  formadorNome: string | null;
  emDia: number;
  venceEmBreve: number;
  atrasado: number;
  nunca: number;
  total: number;
  /** % de formandos que não precisam de ação (em dia + vence em breve). */
  pctCoberto: number | null;
}

export interface PendenteCobertura {
  nome: string;
  moradaNome: string;
  status: Extract<StatusCadencia, "atrasado" | "nunca">;
  diasAtraso: number;
}

export interface RelatorioCobertura {
  cadenciaMeses: number;
  moradas: LinhaCobertura[];
  pendentes: PendenteCobertura[];
  totais: {
    emDia: number;
    venceEmBreve: number;
    atrasado: number;
    nunca: number;
    total: number;
    pctCoberto: number | null;
  };
}

export function montarRelatorioCobertura(
  moradasMeta: MoradaMetaCobertura[],
  formandos: FormandoCobertura[],
  ultimoAcompanhamento: Map<string, Date | null>,
  cadenciaMesesRaw: number | null | undefined,
  hoje: Date = new Date(),
): RelatorioCobertura {
  const cadenciaMeses = normalizarCadencia(cadenciaMesesRaw);

  const porMorada = new Map<string, FormandoCobertura[]>();
  for (const f of formandos) {
    if (!f.moradaId || !f.ativo) continue;
    const arr = porMorada.get(f.moradaId) ?? [];
    arr.push(f);
    porMorada.set(f.moradaId, arr);
  }

  const pendentes: PendenteCobertura[] = [];

  const moradas: LinhaCobertura[] = moradasMeta
    .map((m) => {
      const membros = porMorada.get(m.id) ?? [];
      let emDia = 0;
      let venceEmBreve = 0;
      let atrasado = 0;
      let nunca = 0;
      for (const f of membros) {
        const cad = avaliarCadenciaAcompanhamento(cadenciaMeses, ultimoAcompanhamento.get(f.id) ?? null, hoje);
        if (cad.status === "em_dia") emDia++;
        else if (cad.status === "vence_em_breve") venceEmBreve++;
        else if (cad.status === "atrasado") {
          atrasado++;
          pendentes.push({ nome: f.nome, moradaNome: m.nome, status: "atrasado", diasAtraso: cad.diasAtraso });
        } else {
          nunca++;
          pendentes.push({ nome: f.nome, moradaNome: m.nome, status: "nunca", diasAtraso: 0 });
        }
      }
      const total = membros.length;
      const cobertos = emDia + venceEmBreve;
      return {
        id: m.id,
        nome: m.nome,
        formadorNome: m.formadorNome ?? null,
        emDia,
        venceEmBreve,
        atrasado,
        nunca,
        total,
        pctCoberto: total > 0 ? Math.round((cobertos / total) * 100) : null,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  // Pendentes: atrasados (mais dias primeiro) antes dos "nunca".
  const SEV: Record<string, number> = { atrasado: 0, nunca: 1 };
  pendentes.sort(
    (a, b) => (SEV[a.status] ?? 9) - (SEV[b.status] ?? 9) || b.diasAtraso - a.diasAtraso || a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const totais = moradas.reduce(
    (acc, m) => {
      acc.emDia += m.emDia;
      acc.venceEmBreve += m.venceEmBreve;
      acc.atrasado += m.atrasado;
      acc.nunca += m.nunca;
      acc.total += m.total;
      return acc;
    },
    { emDia: 0, venceEmBreve: 0, atrasado: 0, nunca: 0, total: 0, pctCoberto: null as number | null },
  );
  totais.pctCoberto = totais.total > 0 ? Math.round(((totais.emDia + totais.venceEmBreve) / totais.total) * 100) : null;

  return { cadenciaMeses, moradas, pendentes, totais };
}
