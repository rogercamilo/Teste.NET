import { prisma } from "./prisma";
import { logAction, logError } from "./audit-log";

export type SuppressionMotivo = "BOUNCE" | "COMPLAINT";

/** Normaliza o endereço para a chave de supressão (minúsculas, sem espaços). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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
