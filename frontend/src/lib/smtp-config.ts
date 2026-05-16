/**
 * Server-side SMTP configuration store backed by data/smtp-config.json.
 * Falls back to SMTP_* environment variables if the file is absent.
 * NEVER import this module in client components — it uses Node.js 'fs'.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "smtp-config.json");

export function loadSmtpConfig(): SmtpConfig {
  if (existsSync(FILE)) {
    try {
      const raw = JSON.parse(readFileSync(FILE, "utf-8")) as Partial<SmtpConfig>;
      return {
        host: raw.host ?? "",
        port: raw.port ?? 587,
        secure: raw.secure ?? false,
        user: raw.user ?? "",
        pass: raw.pass ?? "",
        from: raw.from ?? "",
      };
    } catch { /* fall through to env vars */ }
  }
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "",
  };
}

export function saveSmtpConfig(config: SmtpConfig): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function isSmtpReady(config?: SmtpConfig): boolean {
  const c = config ?? loadSmtpConfig();
  return !!(c.host && c.user && c.pass);
}
