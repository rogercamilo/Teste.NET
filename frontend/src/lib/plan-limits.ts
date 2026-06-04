import { prisma } from "@/lib/prisma";
import type { PlanoAssinatura } from "@prisma/client";

export interface PlanLimits {
  gruposFormacao: number;
  formandos: number;
  storageBytes: number;
}

const LIMITS: Record<PlanoAssinatura, PlanLimits> = {
  GRATUITO: { gruposFormacao: 1, formandos: 30, storageBytes: 500 * 1024 * 1024 },
  ESSENCIAL: { gruposFormacao: 3, formandos: 150, storageBytes: 2 * 1024 * 1024 * 1024 },
  PROFISSIONAL: { gruposFormacao: Infinity, formandos: Infinity, storageBytes: Infinity },
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
    select: { planoAssinatura: true, status: true, trialExpiresAt: true },
  });
  if (!org) return { ok: false, reason: "Organização não encontrada" };
  if (org.status === "SUSPENSO" || org.status === "CANCELADO") {
    return { ok: false, reason: "Conta suspensa ou cancelada" };
  }
  if (org.status === "TRIAL" && org.trialExpiresAt && org.trialExpiresAt < new Date()) {
    return { ok: false, reason: "Período de avaliação expirado" };
  }
  return { ok: true, planoAssinatura: org.planoAssinatura };
}

// ── Verificações de limite ────────────────────────────────────────────────────

export async function canAddGrupoFormacao(orgId: string): Promise<LimitCheckResult> {
  const org = await fetchOrgForLimits(orgId);
  if (!org.ok) return { allowed: false, reason: org.reason };

  const limits = getLimits(org.planoAssinatura);
  if (limits.gruposFormacao === Infinity) return { allowed: true };

  const current = await prisma.grupoFormacao.count({ where: { organizacaoId: orgId } });
  const percentUsed = Math.round((current / limits.gruposFormacao) * 100);

  if (current >= limits.gruposFormacao) {
    return {
      allowed: false,
      reason: `Limite de ${limits.gruposFormacao} morada(s) atingido no plano ${org.planoAssinatura}`,
      current,
      limit: limits.gruposFormacao,
      percentUsed,
    };
  }
  return { allowed: true, current, limit: limits.gruposFormacao, percentUsed };
}

export async function canAddFormando(orgId: string): Promise<LimitCheckResult> {
  const org = await fetchOrgForLimits(orgId);
  if (!org.ok) return { allowed: false, reason: org.reason };

  const limits = getLimits(org.planoAssinatura);
  if (limits.formandos === Infinity) return { allowed: true };

  const current = await prisma.formando.count({ where: { organizacaoId: orgId, deletedAt: null } });
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
  const org = await fetchOrgForLimits(orgId);
  if (!org.ok) return { allowed: false, reason: org.reason };

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

  const [gruposFormacaoCount, formandosCount, storageResult] = await Promise.all([
    prisma.grupoFormacao.count({ where: { organizacaoId: orgId } }),
    prisma.formando.count({ where: { organizacaoId: orgId, deletedAt: null } }),
    prisma.arquivo.aggregate({ where: { organizacaoId: orgId }, _sum: { tamanho: true } }),
  ]);

  const storageBytes = storageResult._sum.tamanho ?? 0;

  return {
    plano: org.planoAssinatura,
    gruposFormacao: {
      current: gruposFormacaoCount,
      limit: limits.gruposFormacao === Infinity ? null : limits.gruposFormacao,
      percentUsed: limits.gruposFormacao === Infinity ? 0 : Math.round((gruposFormacaoCount / limits.gruposFormacao) * 100),
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
