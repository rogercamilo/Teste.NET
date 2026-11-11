/**
 * R2 — Frequência por Encontro (builder puro, testável).
 *
 * Monta a matriz formando × encontro do período: cada célula é o estado de
 * presença (presente / falta / falta justificada / não registrado). O percentual
 * por formando (linha) e por encontro (coluna) usa a MESMA régra do resto da
 * plataforma: só "presente"/"ausente" entram no denominador — justificado e não
 * marcado ficam de fora (falta avisada não é falta; o que não foi chamado não conta).
 */

import type { PresencaCelula } from "./tipos";

export interface PresencaFreq {
  formandoId: string;
  agendamentoId: string;
  data: string; // ISO
  titulo: string | null;
  presente: boolean;
  statusFormador?: string | null;
}

export interface FormandoFreq {
  id: string;
  nome: string;
}

export interface EncontroFreq {
  id: string;
  data: string; // ISO
  titulo: string;
  pct: number | null; // % presença da coluna
}

export interface LinhaFreq {
  nome: string;
  celulas: PresencaCelula[]; // alinhadas a `encontros`
  pct: number | null; // % presença da linha
}

export interface RelatorioFrequencia {
  encontros: EncontroFreq[];
  linhas: LinhaFreq[];
  totalEncontros: number;
}

function normalizaCelula(status: string | null | undefined, presente: boolean): PresencaCelula {
  if (status === "presente") return "presente";
  if (status === "ausente") return "ausente";
  if (status === "justificado") return "justificado";
  if (status === undefined) return presente ? "presente" : "nao_marcado"; // retrocompat
  return "nao_marcado"; // status null
}

/** Conta presentes sobre (presentes+faltas) de um conjunto de células. */
function pctDe(celulas: PresencaCelula[]): number | null {
  let total = 0;
  let presentes = 0;
  for (const c of celulas) {
    if (c === "presente") {
      total++;
      presentes++;
    } else if (c === "ausente") {
      total++;
    }
  }
  return total > 0 ? Math.round((presentes / total) * 100) : null;
}

export function montarRelatorioFrequencia(
  formandos: FormandoFreq[],
  presencas: PresencaFreq[],
): RelatorioFrequencia {
  // Conjunto de encontros (colunas), ordenado por data ascendente.
  const encMap = new Map<string, { data: string; titulo: string }>();
  for (const p of presencas) {
    if (!encMap.has(p.agendamentoId)) {
      encMap.set(p.agendamentoId, { data: p.data, titulo: p.titulo?.trim() || "Encontro" });
    }
  }
  const encOrdenados = [...encMap.entries()].sort(
    (a, b) => new Date(a[1].data).getTime() - new Date(b[1].data).getTime(),
  );
  const encIds = encOrdenados.map(([id]) => id);

  // Lookup rápido: `${formandoId}|${agendamentoId}` → célula.
  const celulaPorChave = new Map<string, PresencaCelula>();
  for (const p of presencas) {
    celulaPorChave.set(`${p.formandoId}|${p.agendamentoId}`, normalizaCelula(p.statusFormador, p.presente));
  }

  const linhas: LinhaFreq[] = formandos
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((f) => {
      const celulas = encIds.map((eid) => celulaPorChave.get(`${f.id}|${eid}`) ?? "nao_marcado");
      return { nome: f.nome, celulas, pct: pctDe(celulas) };
    });

  // % por coluna (encontro): junta a célula de cada formando naquele encontro.
  const encontros: EncontroFreq[] = encOrdenados.map(([id, meta], col) => {
    const coluna = linhas.map((l) => l.celulas[col]).filter((c): c is PresencaCelula => c !== undefined);
    return { id, data: meta.data, titulo: meta.titulo, pct: pctDe(coluna) };
  });

  return { encontros, linhas, totalEncontros: encontros.length };
}
