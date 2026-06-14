/**
 * SMTP configuration — stored per-tenant in ConfiguracaoOrg.smtpConfig (PostgreSQL).
 * Falls back to SMTP_* environment variables when no DB record exists.
 * The `pass` field is encrypted at rest using AES-256-GCM (APP_ENCRYPTION_KEY).
 * NEVER import this module in client components — uses Prisma (Node.js only).
 */
import { prisma } from "@/lib/prisma";
import { encryptField, decryptField } from "@/lib/crypto";
import { logError } from "@/lib/audit-log";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function fromEnv(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "",
  };
}

function parseSmtpJson(raw: unknown): SmtpConfig {
  const r = raw as Record<string, unknown>;
  const env = fromEnv();
  let pass = env.pass;
  if (r.pass && typeof r.pass === "string") {
    try {
      pass = decryptField(r.pass);
    } catch {
      pass = env.pass;
    }
  }
  return {
    host: (typeof r.host === "string" ? r.host.trim() : null) ?? env.host,
    port: r.port != null ? Number(r.port) || env.port : env.port,
    secure: r.secure != null ? r.secure === true || r.secure === "true" : env.secure,
    user: (typeof r.user === "string" ? r.user.trim() : null) ?? env.user,
    pass,
    from: (typeof r.from === "string" ? r.from.trim() : null) ?? env.from,
  };
}

export async function loadSmtpConfig(organizacaoId: string): Promise<SmtpConfig> {
  try {
    const cfg = await prisma.configuracaoOrg.findUnique({
      where: { organizacaoId },
      select: { smtpConfig: true },
    });
    if (cfg?.smtpConfig) return parseSmtpJson(cfg.smtpConfig);
  } catch (err) {
    logError("smtp-config/load", err);
  }
  return fromEnv();
}

export async function saveSmtpConfig(organizacaoId: string, config: SmtpConfig): Promise<void> {
  const toStore = {
    ...config,
    pass: config.pass ? encryptField(config.pass) : config.pass,
  };
  await prisma.configuracaoOrg.upsert({
    where: { organizacaoId },
    create: { organizacaoId, smtpConfig: toStore as object },
    update: { smtpConfig: toStore as object },
  });
}

export function isSmtpReady(config: SmtpConfig): boolean {
  return !!(config.host && config.user && config.pass);
}
