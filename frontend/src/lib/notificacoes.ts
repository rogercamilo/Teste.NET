import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";
import type { TipoNotificacao, PerfilUsuario } from "@prisma/client";

// ── Criar notificação ─────────────────────────────────────────────────────────

export interface CriarNotificacaoInput {
  organizacaoId: string;
  destinatarioId: string;
  tipo: TipoNotificacao;
  titulo: string;
  corpo?: string;
  linkAcao?: string;
}

export async function criarNotificacao(input: CriarNotificacaoInput): Promise<void> {
  try {
    await prisma.notificacao.create({ data: input });
  } catch (err) {
    logError("notificacoes:criar", err, { tipo: input.tipo, destinatarioId: input.destinatarioId });
  }
}

export async function criarNotificacoes(
  inputs: CriarNotificacaoInput[]
): Promise<void> {
  if (inputs.length === 0) return;
  try {
    await prisma.notificacao.createMany({ data: inputs });
  } catch (err) {
    logError("notificacoes:criarMany", err);
  }
}

// ── Notificações do FORMANDO (histórico in-app no Portal) ─────────────────────
// Destinatário polimórfico: aqui gravamos `formandoId` (e `destinatarioId` fica
// null). O push é efêmero; isto é a trilha durável que o formando revê no portal.

export interface CriarNotificacaoFormandoInput {
  organizacaoId: string;
  formandoId: string;
  tipo: TipoNotificacao;
  titulo: string;
  corpo?: string;
  linkAcao?: string;
}

export async function criarNotificacaoFormando(
  input: CriarNotificacaoFormandoInput
): Promise<void> {
  try {
    await prisma.notificacao.create({ data: input });
  } catch (err) {
    logError("notificacoes:criarFormando", err, {
      tipo: input.tipo,
      formandoId: input.formandoId,
    });
  }
}

// Um mesmo aviso para vários formandos (ex.: push manual do formador ao grupo).
export async function criarNotificacoesFormandos(
  formandoIds: string[],
  base: Omit<CriarNotificacaoFormandoInput, "formandoId">
): Promise<void> {
  if (formandoIds.length === 0) return;
  try {
    await prisma.notificacao.createMany({
      data: formandoIds.map((formandoId) => ({ ...base, formandoId })),
    });
  } catch (err) {
    logError("notificacoes:criarFormandosMany", err, { tipo: base.tipo });
  }
}

export async function listarNaoLidasFormando(
  formandoId: string,
  organizacaoId: string
) {
  return prisma.notificacao.findMany({
    where: { formandoId, organizacaoId, lida: false },
    orderBy: { criadaEm: "desc" },
    take: 50,
  });
}

export async function marcarLidaFormando(
  id: string,
  formandoId: string,
  organizacaoId: string
): Promise<void> {
  await prisma.notificacao.updateMany({
    where: { id, formandoId, organizacaoId },
    data: { lida: true, lidaEm: new Date() },
  });
}

export async function marcarTodasLidasFormando(
  formandoId: string,
  organizacaoId: string
): Promise<void> {
  await prisma.notificacao.updateMany({
    where: { formandoId, organizacaoId, lida: false },
    data: { lida: true, lidaEm: new Date() },
  });
}

// ── Leitura ───────────────────────────────────────────────────────────────────

export async function listarNaoLidas(usuarioId: string) {
  return prisma.notificacao.findMany({
    where: { destinatarioId: usuarioId, lida: false },
    orderBy: { criadaEm: "desc" },
    take: 50,
  });
}

export async function contarNaoLidas(usuarioId: string): Promise<number> {
  return prisma.notificacao.count({
    where: { destinatarioId: usuarioId, lida: false },
  });
}

// ── Marcar como lida ──────────────────────────────────────────────────────────

export async function marcarLida(id: string, usuarioId: string): Promise<void> {
  await prisma.notificacao.updateMany({
    where: { id, destinatarioId: usuarioId },
    data: { lida: true, lidaEm: new Date() },
  });
}

export async function marcarTodasLidas(usuarioId: string): Promise<void> {
  await prisma.notificacao.updateMany({
    where: { destinatarioId: usuarioId, lida: false },
    data: { lida: true, lidaEm: new Date() },
  });
}

// ── Helpers para gatilhos ─────────────────────────────────────────────────────

// Retorna os IDs de usuários ativos da org com um dos perfis informados.
export async function usuariosPorPerfil(
  organizacaoId: string,
  perfis: PerfilUsuario[]
): Promise<string[]> {
  if (perfis.length === 0) return [];
  const users = await prisma.usuario.findMany({
    where: { organizacaoId, perfil: { in: perfis }, ativo: true, deletedAt: null },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// Revisores da Jornada Vocacional: os Formadores Gerais validam. Sem nenhum FG
// cadastrado, a revisão recai sobre o Administrador (comunidades pequenas).
export async function revisoresDaOrg(organizacaoId: string): Promise<string[]> {
  const fgs = await usuariosPorPerfil(organizacaoId, ["formador_geral"]);
  if (fgs.length > 0) return fgs;
  return usuariosPorPerfil(organizacaoId, ["administrador"]);
}

// Dado um grupoFormacaoId, retorna o formadorId (FC) se existir.
export async function formadorDoGrupo(
  grupoFormacaoId: string
): Promise<string | null> {
  const grupo = await prisma.grupoFormacao.findUnique({
    where: { id: grupoFormacaoId },
    select: { formadorId: true },
  });
  return grupo?.formadorId ?? null;
}

// Dado um array de grupoFormacaoIds, retorna todos os formadorIds distintos.
export async function formadoresDosGrupos(
  grupoFormacaoIds: string[]
): Promise<string[]> {
  if (grupoFormacaoIds.length === 0) return [];
  const grupos = await prisma.grupoFormacao.findMany({
    where: { id: { in: grupoFormacaoIds }, formadorId: { not: null } },
    select: { formadorId: true, organizacaoId: true },
  });
  const ids = [...new Set(grupos.map((g) => g.formadorId!))];
  return ids;
}

// Retorna todos os formadorIds cujos grupos usam o planoId informado.
export async function formadoresDoPlano(
  planoId: string
): Promise<Array<{ formadorId: string; organizacaoId: string }>> {
  const grupos = await prisma.grupoFormacao.findMany({
    where: { planoId, formadorId: { not: null } },
    select: { formadorId: true, organizacaoId: true },
  });
  return grupos.map((g) => ({ formadorId: g.formadorId!, organizacaoId: g.organizacaoId }));
}

// Retorna todos os formadorIds cujos grupos usam o gradeId informado.
export async function formadoresDaGrade(
  gradeId: string
): Promise<Array<{ formadorId: string; organizacaoId: string }>> {
  const grupos = await prisma.grupoFormacao.findMany({
    where: { gradeId, formadorId: { not: null } },
    select: { formadorId: true, organizacaoId: true },
  });
  return grupos.map((g) => ({ formadorId: g.formadorId!, organizacaoId: g.organizacaoId }));
}
