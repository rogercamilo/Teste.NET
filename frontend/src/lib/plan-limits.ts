import { prisma } from "@/lib/prisma";
import type { PlanoAssinatura } from "@prisma/client";

export interface PlanLimits {
  moradas: number;
  formandos: number;
  storageBytes: number;
}

const LIMITS: Record<PlanoAssinatura, PlanLimits> = {
  GRATUITO: { moradas: 1, formandos: 30, storageBytes: 500 * 1024 * 1024 },
  ESSENCIAL: { moradas: 3, formandos: 150, storageBytes: 2 * 1024 * 1024 * 1024 },
  PROFISSIONAL: { moradas: Infinity, formandos: Infinity, storageBytes: Infinity },
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

export async function canAddMorada(orgId: string): Promise<LimitCheckResult> {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { planoAssinatura: true, status: true, trialExpiresAt: true },
  });
  if (!org) return { allowed: false, reason: "Organização não encontrada" };
  if (org.status === "SUSPENSO" || org.status === "CANCELADO") {
    return { allowed: false, reason: "Conta suspensa ou cancelada" };
  }
  if (org.status === "TRIAL" && org.trialExpiresAt && org.trialExpiresAt < new Date()) {
    return { allowed: false, reason: "Período de avaliação expirado" };
  }

  const limits = getLimits(org.planoAssinatura);
  if (limits.moradas === Infinity) return { allowed: true };

  const current = await prisma.morada.count({ where: { organizacaoId: orgId } });
  const percentUsed = Math.round((current / limits.moradas) * 100);

  if (current >= limits.moradas) {
    return {
      allowed: false,
      reason: `Limite de ${limits.moradas} morada(s) atingido no plano ${org.planoAssinatura}`,
      current,
      limit: limits.moradas,
      percentUsed,
    };
  }
  return { allowed: true, current, limit: limits.moradas, percentUsed };
}

export async function canAddFormando(orgId: string): Promise<LimitCheckResult> {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { planoAssinatura: true, status: true, trialExpiresAt: true },
  });
  if (!org) return { allowed: false, reason: "Organização não encontrada" };
  if (org.status === "SUSPENSO" || org.status === "CANCELADO") {
    return { allowed: false, reason: "Conta suspensa ou cancelada" };
  }
  if (org.status === "TRIAL" && org.trialExpiresAt && org.trialExpiresAt < new Date()) {
    return { allowed: false, reason: "Período de avaliação expirado" };
  }

  const limits = getLimits(org.planoAssinatura);
  if (limits.formandos === Infinity) return { allowed: true };

  const current = await prisma.formando.count({ where: { organizacaoId: orgId } });
  const percentUsed = Math.round((current / limits.formandos) * 100);

  if (current >= limits.formandos) {
    return {
      allowed: false,
      reason: `Limite de ${limits.formandos} formando(s) atingido no plano ${org.planoAssinatura}`,
      current,
      limit: limits.formandos,
      percentUsed,
    };
  }
  return { allowed: true, current, limit: limits.formandos, percentUsed };
}

export async function canUpload(orgId: string, sizeBytes: number): Promise<LimitCheckResult> {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { planoAssinatura: true, status: true, trialExpiresAt: true },
  });
  if (!org) return { allowed: false, reason: "Organização não encontrada" };
  if (org.status === "SUSPENSO" || org.status === "CANCELADO") {
    return { allowed: false, reason: "Conta suspensa ou cancelada" };
  }
  if (org.status === "TRIAL" && org.trialExpiresAt && org.trialExpiresAt < new Date()) {
    return { allowed: false, reason: "Período de avaliação expirado" };
  }

  const limits = getLimits(org.planoAssinatura);
  if (limits.storageBytes === Infinity) return { allowed: true };

  const result = await prisma.arquivo.aggregate({
    where: { organizacaoId: orgId },
    _sum: { tamanho: true },
  });
  const usedBytes = result._sum.tamanho ?? 0;
  const afterBytes = usedBytes + sizeBytes;
  const percentUsed = Math.round((afterBytes / limits.storageBytes) * 100);

  if (afterBytes > limits.storageBytes) {
    const limitMb = Math.round(limits.storageBytes / (1024 * 1024));
    return {
      allowed: false,
      reason: `Limite de armazenamento de ${limitMb} MB atingido`,
      current: usedBytes,
      limit: limits.storageBytes,
      percentUsed,
    };
  }
  return { allowed: true, current: usedBytes, limit: limits.storageBytes, percentUsed };
}

export async function getUsage(orgId: string) {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: { planoAssinatura: true },
  });
  if (!org) throw new Error("Organização não encontrada");

  const limits = getLimits(org.planoAssinatura);

  const [moradasCount, formandosCount, storageResult] = await Promise.all([
    prisma.morada.count({ where: { organizacaoId: orgId } }),
    prisma.formando.count({ where: { organizacaoId: orgId } }),
    prisma.arquivo.aggregate({ where: { organizacaoId: orgId }, _sum: { tamanho: true } }),
  ]);

  const storageBytes = storageResult._sum.tamanho ?? 0;

  return {
    plano: org.planoAssinatura,
    moradas: {
      current: moradasCount,
      limit: limits.moradas === Infinity ? null : limits.moradas,
      percentUsed: limits.moradas === Infinity ? 0 : Math.round((moradasCount / limits.moradas) * 100),
    },
    formandos: {
      current: formandosCount,
      limit: limits.formandos === Infinity ? null : limits.formandos,
      percentUsed: limits.formandos === Infinity ? 0 : Math.round((formandosCount / limits.formandos) * 100),
    },
    storage: {
      current: storageBytes,
      limit: limits.storageBytes === Infinity ? null : limits.storageBytes,
      percentUsed: limits.storageBytes === Infinity ? 0 : Math.round((storageBytes / limits.storageBytes) * 100),
    },
  };
}
