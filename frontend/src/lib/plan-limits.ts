import { prisma } from "@/lib/prisma";
import type { PlanoAssinatura } from "@prisma/client";
import { logAction } from "@/lib/audit-log";
import { sendPlanLimitReachedEmail } from "@/lib/email";

export interface PlanLimits {
  /** Total de usuários ativos (formandos + usuários da plataforma). 0 = sem assinatura ativa. */
  usuarios: number;
  storageBytes: number;
}

// GRATUITO = 0 → bloqueia adição de qualquer usuário (estado sem assinatura)
const LIMITS: Record<PlanoAssinatura, PlanLimits> = {
  GRATUITO:     { usuarios: 0,        storageBytes: 0 },
  BASICO:       { usuarios: 60,       storageBytes: 2  * 1024 * 1024 * 1024 },
  INTERMEDIARIO:{ usuarios: 140,      storageBytes: 10 * 1024 * 1024 * 1024 },
  AVANCADO:     { usuarios: 350,      storageBytes: 30 * 1024 * 1024 * 1024 },
  PERSONALIZADO:{ usuarios: Infinity, storageBytes: Infinity },
};

export function getLimits(plano: PlanoAssinatura): PlanLimits {
  return LIMITS[plano];
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  current?: number;
  limit?: number;
  percentUsed?: number;
}

// ── Helper interno ────────────────────────────────────────────────────────────

type OrgAccess =
  | { ok: true; planoAssinatura: PlanoAssinatura }
  | { ok: false; reason: string };

async function fetchOrgForLimits(orgId: string): Promise<OrgAccess> {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { planoAssinatura: true, status: true, trialExpiresAt: true, cortesia: true, cortesiaExpiresAt: true },
  });
  if (!org) return { ok: false, reason: "Organização não encontrada" };
  if (org.status === "SUSPENSO" || org.status === "CANCELADO") {
    return { ok: false, reason: "Conta suspensa ou cancelada" };
  }
  // Cortesia vigente concede acesso ativo (limites do tier concedido) — nunca é
  // tratada como avaliação, então o bloqueio de trial expirado não se aplica.
  const cortesiaVigente = org.cortesia && (!org.cortesiaExpiresAt || org.cortesiaExpiresAt > new Date());
  if (!cortesiaVigente && org.status === "TRIAL" && org.trialExpiresAt && org.trialExpiresAt < new Date()) {
    return { ok: false, reason: "Período de avaliação expirado" };
  }
  return { ok: true, planoAssinatura: org.planoAssinatura };
}

// ── Verificação de limite de usuários ────────────────────────────────────────

/** Verifica se a org pode adicionar um novo usuário (formando ou usuário da plataforma). */
export async function canAddUser(orgId: string): Promise<LimitCheckResult> {
  const org = await fetchOrgForLimits(orgId);
  if (!org.ok) return { allowed: false, reason: org.reason };

  const limits = getLimits(org.planoAssinatura);

  if (limits.usuarios === 0) {
    return {
      allowed: false,
      reason: "Sem assinatura ativa. Assine um plano para continuar.",
    };
  }

  if (limits.usuarios === Infinity) return { allowed: true };

  const [formandosCount, usuariosCount] = await Promise.all([
    prisma.formando.count({ where: { organizacaoId: orgId, deletedAt: null } }),
    prisma.usuario.count({ where: { organizacaoId: orgId, deletedAt: null } }),
  ]);

  const current = formandosCount + usuariosCount;
  const percentUsed = Math.round((current / limits.usuarios) * 100);

  if (current >= limits.usuarios) {
    return {
      allowed: false,
      reason: `Limite de ${limits.usuarios} usuários ativos atingido no plano atual`,
      current,
      limit: limits.usuarios,
      percentUsed,
    };
  }
  return { allowed: true, current, limit: limits.usuarios, percentUsed };
}

/** @deprecated Use canAddUser. Grupos de formação são ilimitados em todos os planos. */
export async function canAddGrupoFormacao(): Promise<LimitCheckResult> {
  return { allowed: true };
}

/** @deprecated Use canAddUser. */
export async function canAddFormando(orgId: string): Promise<LimitCheckResult> {
  return canAddUser(orgId);
}

// ── Verificação de armazenamento ──────────────────────────────────────────────

export async function canUpload(orgId: string, sizeBytes: number): Promise<LimitCheckResult> {
  const org = await fetchOrgForLimits(orgId);
  if (!org.ok) return { allowed: false, reason: org.reason };

  const limits = getLimits(org.planoAssinatura);
  if (limits.storageBytes === Infinity) return { allowed: true };

  if (limits.storageBytes === 0) {
    return { allowed: false, reason: "Sem assinatura ativa. Assine um plano para fazer uploads." };
  }

  const result = await prisma.arquivo.aggregate({
    where: { organizacaoId: orgId },
    _sum: { tamanho: true },
  });
  const usedBytes = result._sum.tamanho ?? 0;
  const afterBytes = usedBytes + sizeBytes;
  const percentUsed = Math.round((afterBytes / limits.storageBytes) * 100);

  if (afterBytes > limits.storageBytes) {
    const limitGb = (limits.storageBytes / (1024 * 1024 * 1024)).toFixed(0);
    return {
      allowed: false,
      reason: `Limite de armazenamento de ${limitGb} GB atingido`,
      current: usedBytes,
      limit: limits.storageBytes,
      percentUsed,
    };
  }
  return { allowed: true, current: usedBytes, limit: limits.storageBytes, percentUsed };
}

// ── Uso atual ─────────────────────────────────────────────────────────────────

export async function getUsage(orgId: string) {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { planoAssinatura: true },
  });
  if (!org) throw new Error("Organização não encontrada");

  const limits = getLimits(org.planoAssinatura);

  const [formandosCount, usuariosCount, storageResult] = await Promise.all([
    prisma.formando.count({ where: { organizacaoId: orgId, deletedAt: null } }),
    prisma.usuario.count({ where: { organizacaoId: orgId, deletedAt: null } }),
    prisma.arquivo.aggregate({ where: { organizacaoId: orgId }, _sum: { tamanho: true } }),
  ]);

  const totalUsuarios = formandosCount + usuariosCount;
  const storageBytes = storageResult._sum.tamanho ?? 0;
  const usuariosLimit = limits.usuarios === Infinity || limits.usuarios === 0 ? null : limits.usuarios;
  const storageLimit = limits.storageBytes === Infinity || limits.storageBytes === 0 ? null : limits.storageBytes;

  return {
    plano: org.planoAssinatura,
    usuarios: {
      current: totalUsuarios,
      limit: usuariosLimit,
      percentUsed: usuariosLimit ? Math.round((totalUsuarios / usuariosLimit) * 100) : 0,
    },
    storage: {
      current: storageBytes,
      limit: storageLimit,
      percentUsed: storageLimit ? Math.round((storageBytes / storageLimit) * 100) : 0,
    },
  };
}

export type UsageInfo = Awaited<ReturnType<typeof getUsage>>;

// ── Notificação de limite AVANCADO ────────────────────────────────────────────

const NOTIFY_COOLDOWN_DAYS = 7;

/**
 * Quando uma org AVANCADO bate no limite, envia um e-mail aos admins sugerindo
 * o upgrade para PERSONALIZADO. Respeita cooldown de 7 dias por tipo de limite.
 * Fire-and-forget — não bloqueia a resposta da API.
 */
export function notifyAvancadoLimitIfNeeded(
  orgId: string,
  tipoLimite: "usuarios" | "storage"
): void {
  doNotify(orgId, tipoLimite).catch(() => {});
}

async function doNotify(
  orgId: string,
  tipoLimite: "usuarios" | "storage"
): Promise<void> {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { nome: true, planoAssinatura: true },
  });
  if (!org || org.planoAssinatura !== "AVANCADO") return;

  const cooldownDate = new Date(Date.now() - NOTIFY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
  const recent = await prisma.auditLog.findFirst({
    where: {
      organizacaoId: orgId,
      acao: "plan_limit_email_enviado",
      detalhes: { path: ["tipoLimite"], equals: tipoLimite },
      criadoEm: { gte: cooldownDate },
    },
  });
  if (recent) return;

  const admins = await prisma.usuario.findMany({
    where: { organizacaoId: orgId, perfil: "administrador", deletedAt: null, ativo: true },
    select: { id: true, email: true },
  });
  if (admins.length === 0) return;

  for (const admin of admins) {
    await sendPlanLimitReachedEmail({
      organizacaoId: orgId,
      email: admin.email,
      orgNome: org.nome,
      tipoLimite,
    });
  }

  logAction("plan_limit_email_enviado", "system", undefined, { tipoLimite }, orgId);
}
