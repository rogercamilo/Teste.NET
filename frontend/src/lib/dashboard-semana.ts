/**
 * Helpers puros da faixa "Minha semana" do dashboard (item 2.2).
 *
 * Sem dependências de servidor — testáveis isoladamente. Datas de aniversário
 * são comparadas por mês/dia e ancoradas ao meio-dia local para não rolar de dia
 * em fusos negativos (ver feedback-date-only-timezone).
 */

export type Saudacao = "Bom dia" | "Boa tarde" | "Boa noite";

/** Saudação conforme a hora local: 5–11 manhã, 12–17 tarde, resto noite. */
export function saudacaoPorHora(date: Date = new Date()): Saudacao {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Primeiro token não vazio do nome (ex.: "Maria Clara" → "Maria"). */
export function primeiroNome(nome: string | null | undefined): string {
  if (!nome) return "";
  return nome.trim().split(/\s+/)[0] ?? "";
}

export interface PessoaAniversario {
  id: string;
  nome: string;
  dataNascimento: Date;
}

export interface Aniversariante {
  id: string;
  nome: string;
  /** Rótulo da proximidade: "hoje", "amanhã" ou "sáb, 05/07". */
  quando: string;
  /** Dias até o aniversário (0 = hoje) — usado para ordenar. */
  emDias: number;
}

const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Zera a hora ancorando ao meio-dia local (evita rolagem de fuso). */
function meioDia(ano: number, mes: number, dia: number): Date {
  return new Date(ano, mes, dia, 12, 0, 0, 0);
}

/**
 * Aniversariantes cujo aniversário cai nos próximos `dias` (inclusive hoje).
 * Trata a virada de ano (ex.: hoje 28/12, aniversário 02/01). Ignora 29/02 em
 * anos não bissextos deslocando para 01/03 implicitamente via Date.
 */
export function aniversariantesNaJanela(
  pessoas: PessoaAniversario[],
  hoje: Date = new Date(),
  dias = 7
): Aniversariante[] {
  const base = meioDia(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const resultado: Aniversariante[] = [];

  for (const p of pessoas) {
    const nasc = p.dataNascimento;
    // Próxima ocorrência do aniversário a partir de hoje (mesmo ano ou próximo).
    let prox = meioDia(base.getFullYear(), nasc.getMonth(), nasc.getDate());
    if (prox.getTime() < base.getTime()) {
      prox = meioDia(base.getFullYear() + 1, nasc.getMonth(), nasc.getDate());
    }
    const emDias = Math.round((prox.getTime() - base.getTime()) / 86_400_000);
    if (emDias < 0 || emDias > dias) continue;

    let quando: string;
    if (emDias === 0) quando = "hoje";
    else if (emDias === 1) quando = "amanhã";
    else quando = `${DIAS_SEMANA[prox.getDay()]}, ${String(prox.getDate()).padStart(2, "0")}/${String(prox.getMonth() + 1).padStart(2, "0")}`;

    resultado.push({ id: p.id, nome: p.nome, quando, emDias });
  }

  return resultado.sort((a, b) => a.emDias - b.emDias);
}
