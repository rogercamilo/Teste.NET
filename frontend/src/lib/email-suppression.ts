import { prisma } from "./prisma";
import { logAction, logError } from "./audit-log";

export type SuppressionMotivo = "BOUNCE" | "COMPLAINT";

/** Normaliza o endereço para a chave de supressão (minúsculas, sem espaços). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Mascara o endereço para exibição no cockpit: preserva os 2 primeiros
 * caracteres e o domínio (útil para triagem de deliverability) sem expor o
 * endereço completo de terceiros — alinhado à postura LGPD da plataforma.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return "***";
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

export interface SuppressionStats {
  total: number;
  bounces: number;
  complaints: number;
  recent: { email: string; motivo: SuppressionMotivo; criadoEm: string }[];
}

/**
 * Saúde de entrega de e-mail (Resend): total de endereços suprimidos e quebra
 * por motivo (hard bounce × reclamação), mais os últimos eventos com endereço
 * mascarado. Alimenta o painel de infraestrutura do super-admin. Retorna null
 * se a query falhar — o painel degrada sem quebrar.
 */
export async function getEmailSuppressionStats(recentLimit = 8): Promise<SuppressionStats | null> {
  try {
    const [grouped, recentRows] = await Promise.all([
      prisma.emailSuppression.groupBy({ by: ["motivo"], _count: { id: true } }),
      prisma.emailSuppression.findMany({
        orderBy: { criadoEm: "desc" },
        take: recentLimit,
        select: { email: true, motivo: true, criadoEm: true },
      }),
    ]);

    const countOf = (m: SuppressionMotivo) =>
      grouped.find((g) => g.motivo === m)?._count.id ?? 0;
    const bounces = countOf("BOUNCE");
    const complaints = countOf("COMPLAINT");

    return {
      total: bounces + complaints,
      bounces,
      complaints,
      recent: recentRows.map((r) => ({
        email: maskEmail(r.email),
        motivo: r.motivo as SuppressionMotivo,
        criadoEm: r.criadoEm.toISOString(),
      })),
    };
  } catch (err) {
    logError("email/suppression-stats", err);
    return null;
  }
}

/**
 * Verifica se um endereço está na lista de supressão. Falha de forma segura:
 * em caso de erro de banco, retorna `false` para não bloquear envios legítimos.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  try {
    const row = await prisma.emailSuppression.findUnique({
      where: { email: normalizeEmail(email) },
      select: { id: true },
    });
    return row !== null;
  } catch (err) {
    logError("email/suppression-check", err);
    return false;
  }
}

/**
 * Adiciona (ou atualiza) um endereço na lista de supressão. Idempotente por
 * endereço — um novo evento sobrescreve motivo/detalhe mais recentes.
 */
export async function suppressEmail(params: {
  email: string;
  motivo: SuppressionMotivo;
  detalhe?: string | null;
  emailId?: string | null;
  organizacaoId?: string | null;
}): Promise<void> {
  const email = normalizeEmail(params.email);
  const data = {
    motivo: params.motivo,
    detalhe: params.detalhe ?? null,
    emailId: params.emailId ?? null,
    organizacaoId: params.organizacaoId ?? null,
  };
  try {
    await prisma.emailSuppression.upsert({
      where: { email },
      create: { email, ...data },
      update: data,
    });
    logAction(
      "email_suppressed",
      "system",
      undefined,
      { motivo: params.motivo, emailId: params.emailId ?? undefined },
      params.organizacaoId ?? undefined
    );
  } catch (err) {
    logError("email/suppress", err, { motivo: params.motivo });
  }
}
