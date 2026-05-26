/**
 * SMTP configuration — stored per-tenant in ConfiguracaoOrg.smtpConfig (PostgreSQL).
 * Falls back to SMTP_* environment variables when no DB record exists.
 * The `pass` field is encrypted at rest using AES-256-GCM (APP_ENCRYPTION_KEY).
 * NEVER import this module in client components — uses Prisma (Node.js only).
 */
import { prisma } from "@/lib/prisma";
import { encryptField, decryptField } from "@/lib/crypto";

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
  const r = raw as Partial<SmtpConfig>;
  const env = fromEnv();
  return {
    host: r.host ?? env.host,
    port: r.port ?? env.port,
    secure: r.secure ?? env.secure,
    user: r.user ?? env.user,
    pass: r.pass ? decryptField(r.pass) : env.pass,
    from: r.from ?? env.from,
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
    // Covers: DB unavailable at cold start, or decryption failure after key rotation
    console.error("[smtp-config] Failed to load config from DB, falling back to env vars:", err);
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
