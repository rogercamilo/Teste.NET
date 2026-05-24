/**
 * Structured audit logging with mandatory IP anonymization.
 * IPv4: last octet replaced by xxx  (192.168.1.150 → 192.168.1.xxx)
 * IPv6: truncated to first 4 groups (2001:db8:85a3::8a2e → 2001:db8:85a3:xxxx:…)
 *
 * Logs are written to stdout as JSON AND persisted in the AuditLog table (D2.8).
 */

export type AuditAction =
  | "login_success"
  | "login_failure"
  | "login_blocked"
  | "logout"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "password_changed"
  | "document_uploaded"
  | "document_deleted"
  | "file_uploaded"
  | "file_deleted"
  | "smtp_config_changed"
  | "email_template_changed"
  | "email_test_sent"
  | "morada_created"
  | "morada_updated"
  | "morada_deleted"
  | "formando_created"
  | "formando_updated"
  | "formando_deleted"
  | "plano_created"
  | "plano_updated"
  | "plano_deleted"
  | "grade_created"
  | "grade_updated"
  | "grade_deleted"
  | "formacao_created"
  | "formacao_updated"
  | "formacao_deleted"
  | "agendamento_created"
  | "agendamento_updated"
  | "agendamento_deleted"
  | "presenca_registrada"
  | "presenca_updated"
  | "presenca_deleted"
  | "comentario_created"
  | "comentario_updated"
  | "comentario_deleted"
  | "evento_created"
  | "evento_updated"
  | "evento_deleted"
  | "organizacao_updated"
  | "organizacao_created"
  | "organizacao_suspended"
  | "organizacao_reactivated"
  | "organizacao_cancelada"
  | "organizacao_plan_changed"
  | "convite_criado"
  | "convite_aceito"
  | "convite_cancelado"
  | "convite_expirado"
  | "dados_importados"
  | "onboarding_completed"
  | "stripe_checkout_iniciado"
  | "stripe_checkout_concluido"
  | "stripe_portal_acessado"
  | "stripe_assinatura_cancelada"
  | "stripe_pagamento_falhou"
  | "account_deleted"
  | "organizacao_deleted"
  | "organizacao_cortesia_concedida"
  | "organizacao_cortesia_revogada"
  | "dados_exportados"
  | "organizacao_exportada"
  | "privacy_accepted"
  | "terms_accepted"
  | "audit_log_purged"
  | "deletion_request_processed";

export interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  userId: string;
  organizacaoId?: string;
  ipAnon: string;
  details?: Record<string, unknown>;
}

export function anonymizeIp(ip: string | null | undefined): string {
  if (!ip) return "unknown";
  const cleaned = ip.split(",")[0].trim();

  if (cleaned.includes(".")) {
    const parts = cleaned.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }

  if (cleaned.includes(":")) {
    const groups = cleaned.split(":");
    return groups.slice(0, 4).join(":") + ":xxxx:xxxx:xxxx:xxxx";
  }

  return "unknown";
}

export function getClientIp(request: Request): string {
  // Only trust X-Forwarded-For when explicitly behind a known reverse proxy.
  // Without TRUST_PROXY=true an attacker can spoof this header to bypass rate limits.
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function logAction(
  action: AuditAction,
  userId: string | undefined,
  ip: string | undefined,
  details?: Record<string, unknown>,
  organizacaoId?: string
): void {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId: userId ?? "anonymous",
    ...(organizacaoId ? { organizacaoId } : {}),
    ipAnon: anonymizeIp(ip),
    ...(details ? { details } : {}),
  };
  console.log(JSON.stringify(entry));

  // Persistência assíncrona no banco (D2.8) — não bloqueia a resposta
  persistAuditLog(entry, organizacaoId).catch(() => {});
}

async function persistAuditLog(
  entry: AuditEntry,
  organizacaoId?: string
): Promise<void> {
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.auditLog.create({
      data: {
        acao: entry.action,
        usuarioId: entry.userId !== "anonymous" ? entry.userId : null,
        organizacaoId: organizacaoId ?? null,
        ip: entry.ipAnon,
        detalhes: (entry.details as object) ?? null,
      },
    });
  } catch {
    // Falha silenciosa — o log em stdout já foi gravado
  }
}
