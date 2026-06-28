/**
 * Regras de decisão do Período Vocacional — funções PURAS, sem I/O.
 *
 * Concentra as decisões sensíveis (elegibilidade, visibilidade do foro íntimo,
 * estados terminais, motivo do termo de término) num único lugar testável, em
 * vez de espalhá-las pelas rotas. As rotas apenas orquestram I/O em volta delas.
 */
import { temPermissao, type CondicaoMembro } from "@/types";

// ── Estados ───────────────────────────────────────────────────────────────────

/** Condições que caracterizam um membro JÁ FORMAL (inelegível ao vocacional). */
export const CONDICOES_FORMAIS: ReadonlySet<CondicaoMembro> = new Set<CondicaoMembro>([
  "membro_em_experiencia",
  "membro_em_formacao",
  "membro_primeiras_promessas",
  "membro_consagrado",
  "membro_definitivas",
]);

/** Estados terminais de uma participação (não admitem nova transição). */
export const STATUS_TERMINAIS: ReadonlySet<string> = new Set([
  "concluida_deferida",
  "recusada_arquivada",
  "indeferida_arquivada",
  "cancelada",
]);

/** Estados em curso (não terminais) — usado para detectar dupla participação. */
export const STATUS_EM_ANDAMENTO = ["ativa", "aguardando_carta", "em_discernimento"] as const;

/** Estados em que a carta de discernimento ainda pode ser registrada/corrigida. */
export const STATUS_CARTA_PERMITIDOS: ReadonlySet<string> = new Set(STATUS_EM_ANDAMENTO);

/** Desfechos terminais que lavram termo de término (cancelamento NÃO entra aqui). */
export const DESFECHOS_TERMINO: ReadonlySet<string> = new Set([
  "concluida_deferida",
  "recusada_arquivada",
  "indeferida_arquivada",
]);

export function participacaoEncerrada(status: string): boolean {
  return STATUS_TERMINAIS.has(status);
}

export function cartaPermitida(status: string): boolean {
  return STATUS_CARTA_PERMITIDOS.has(status);
}

// ── Elegibilidade da inscrição ────────────────────────────────────────────────

export type ResultadoElegibilidade = { ok: true } | { ok: false; motivo: string };

/**
 * O vocacional é oferecido a membros NÃO formais. Recusa quem já é membro formal
 * (preservando a condição canônica) e quem já tem uma participação em andamento.
 */
export function validarElegibilidadeVocacional(input: {
  condicaoAtual: CondicaoMembro | null | undefined;
  temParticipacaoEmAndamento: boolean;
}): ResultadoElegibilidade {
  if (input.temParticipacaoEmAndamento) {
    return { ok: false, motivo: "Este formando já participa de um período vocacional em andamento." };
  }
  if (input.condicaoAtual && CONDICOES_FORMAIS.has(input.condicaoAtual)) {
    return { ok: false, motivo: "O período vocacional é destinado a membros não formais; este já é membro da comunidade." };
  }
  return { ok: true };
}

// ── Visibilidade do acompanhamento (foro íntimo) ──────────────────────────────

/**
 * Anotações de acompanhamento são visíveis SOMENTE ao acompanhador designado, ao
 * formador responsável pela turma e à gestão (formador_geral / administrador).
 * O vocacionado nunca acessa.
 */
export function podeVerAcompanhamento(
  user: { id?: string | null; role?: string },
  ctx: { acompanhadorId: string | null; turmaFormadorId: string | null },
): boolean {
  if (temPermissao(user.role, "formador_geral")) return true; // FG + administrador
  if (user.id && ctx.acompanhadorId === user.id) return true;
  if (user.id && ctx.turmaFormadorId === user.id) return true;
  return false;
}

// ── Texto do desfecho (parametriza o termo de término) ────────────────────────

const MOTIVO_TERMINO: Record<string, string> = {
  concluida_deferida: "com o deferimento do pedido de ingresso à jornada formativa",
  recusada_arquivada: "por recusa do(a) candidato(a) em prosseguir",
  indeferida_arquivada: "por indeferimento do pedido pelo governo da comunidade",
};

export function motivoTermino(status: string): string {
  return MOTIVO_TERMINO[status] ?? "";
}
