import type { DepoimentoStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { logAction } from "./audit-log";

// Depoimentos de clientes: prova social pública + `aggregateRating` (estrela no
// Google). Curados pelo super-admin (entrada manual na Fase A). Sem escopo de
// tenant — são da plataforma.

/** Nº mínimo de depoimentos publicados para emitir o `aggregateRating`. Abaixo
 *  disso o markup é "fino" e o Google pode desconsiderar/penalizar — melhor não
 *  emitir do que emitir com 1–2 avaliações. */
export const MIN_REVIEWS_AGGREGATE = 3;

/** Campos seguros para exibição pública (nunca vaza consentimento/origem/etc.). */
export interface DepoimentoPublico {
  id: string;
  nome: string;
  papel: string | null;
  comunidade: string | null;
  texto: string;
  nota: number;
  foto: string | null;
  destaque: boolean;
}

/** Depoimentos publicados, na ordem de exibição (destaque primeiro, depois
 *  ordem manual, depois mais recentes). Usado na landing e em /precos. */
export async function getDepoimentosPublicados(): Promise<DepoimentoPublico[]> {
  return prisma.depoimento.findMany({
    where: { status: "publicado" },
    orderBy: [{ destaque: "desc" }, { ordem: "asc" }, { publicadoEm: "desc" }],
    select: {
      id: true,
      nome: true,
      papel: true,
      comunidade: true,
      texto: true,
      nota: true,
      foto: true,
      destaque: true,
    },
  });
}

/** Média e contagem das avaliações publicadas — só retorna quando há reviews
 *  reais suficientes (>= MIN_REVIEWS_AGGREGATE); senão `null` (não emitir). */
export async function getAggregateRating(): Promise<{ ratingValue: number; reviewCount: number } | null> {
  const agg = await prisma.depoimento.aggregate({
    where: { status: "publicado" },
    _avg: { nota: true },
    _count: { _all: true },
  });
  const count = agg._count._all;
  if (count < MIN_REVIEWS_AGGREGATE || agg._avg.nota == null) return null;
  return {
    ratingValue: Math.round(agg._avg.nota * 10) / 10, // 1 casa decimal
    reviewCount: count,
  };
}

// ── Administração (super-admin) ──────────────────────────────────────────────

export interface DepoimentoInput {
  nome: string;
  papel?: string | null;
  comunidade?: string | null;
  texto: string;
  nota: number;
  foto?: string | null;
  status?: DepoimentoStatus;
  destaque?: boolean;
  ordem?: number;
  consentimento?: boolean;
  origem?: string;
}

/** Lista completa para o cockpit (todos os status), com métricas de resumo. */
export async function listDepoimentos() {
  const depoimentos = await prisma.depoimento.findMany({
    orderBy: [{ ordem: "asc" }, { criadoEm: "desc" }],
  });
  const counts = depoimentos.reduce(
    (acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  return { depoimentos, counts };
}

export async function createDepoimento(input: DepoimentoInput, actorId: string) {
  const status = input.status ?? "rascunho";
  const dep = await prisma.depoimento.create({
    data: {
      nome: input.nome.trim(),
      papel: input.papel?.trim() || null,
      comunidade: input.comunidade?.trim() || null,
      texto: input.texto.trim(),
      nota: input.nota,
      foto: input.foto?.trim() || null,
      status,
      destaque: input.destaque ?? false,
      ordem: input.ordem ?? 0,
      consentimento: input.consentimento ?? false,
      origem: input.origem?.trim() || "manual",
      publicadoEm: status === "publicado" ? new Date() : null,
    },
  });
  logAction("depoimento_criado", actorId, undefined, { depoimentoId: dep.id, status });
  return dep;
}

export async function updateDepoimento(id: string, input: DepoimentoInput, actorId: string) {
  const atual = await prisma.depoimento.findUnique({
    where: { id },
    select: { status: true, publicadoEm: true },
  });
  if (!atual) return null;

  const novoStatus = input.status ?? atual.status;
  // Carimba publicadoEm na 1ª publicação; preserva nas edições seguintes.
  const publicadoEm =
    novoStatus === "publicado"
      ? atual.publicadoEm ?? new Date()
      : atual.publicadoEm;

  const data: Prisma.DepoimentoUpdateInput = {
    nome: input.nome.trim(),
    papel: input.papel?.trim() || null,
    comunidade: input.comunidade?.trim() || null,
    texto: input.texto.trim(),
    nota: input.nota,
    foto: input.foto?.trim() || null,
    status: novoStatus,
    destaque: input.destaque ?? false,
    ordem: input.ordem ?? 0,
    consentimento: input.consentimento ?? false,
    origem: input.origem?.trim() || "manual",
    publicadoEm,
  };

  const dep = await prisma.depoimento.update({ where: { id }, data });
  logAction("depoimento_atualizado", actorId, undefined, { depoimentoId: id, status: novoStatus });
  return dep;
}

export async function deleteDepoimento(id: string, actorId: string) {
  const dep = await prisma.depoimento.delete({ where: { id } }).catch(() => null);
  if (dep) logAction("depoimento_excluido", actorId, undefined, { depoimentoId: id });
  return dep;
}
