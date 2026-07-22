import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

// ── In-memory fallback (dev / no Upstash configured) ────────────────────────

interface Entry {
  count: number;
  windowStart: number;
  windowMs: number;
}

const store = new Map<string, Entry>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= entry.windowMs) store.delete(key);
  }
}

function inMemoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (now - lastCleanup >= CLEANUP_INTERVAL) {
    cleanup();
    lastCleanup = now;
  }
  const entry = store.get(key);
  if (!entry || now - entry.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now, windowMs });
    return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetInMs: windowMs - (now - entry.windowStart) };
  }
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetInMs: windowMs - (now - entry.windowStart) };
}

// ── Upstash Redis (production) ───────────────────────────────────────────────

const isUpstashConfigured =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

if (!isUpstashConfigured && process.env.NODE_ENV === "production") {
  console.warn("[rate-limit] Upstash não configurado — usando limitador in-memory (ineficaz em múltiplas instâncias). Configure UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.");
}

let redis: Redis | null = null;
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(configKey: string, limit: number, windowMs: number): Ratelimit {
  if (!upstashLimiters.has(configKey)) {
    if (!redis) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
        // O cliente re-tenta 5x com backoff exponencial por padrão. Numa
        // indisponibilidade/latência do Upstash, esses retries empilhavam até
        // dezenas de segundos e travavam a requisição do usuário (CPU ociosa,
        // esperando I/O). Uma única tentativa curta basta — o rate-limit é
        // best-effort e degrada para o in-memory abaixo.
        retry: { retries: 1, backoff: () => 200 },
      });
    }
    const seconds = Math.ceil(windowMs / 1000);
    upstashLimiters.set(
      configKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${seconds} s`),
        prefix: "Formattio:rl",
        // Rede lenta NUNCA pode bloquear a resposta: se o Upstash não responder
        // em 1s, o Ratelimit resolve como sucesso (fail-open). Proteção de abuso
        // é secundária à disponibilidade do produto.
        timeout: 1000,
      })
    );
  }
  return upstashLimiters.get(configKey)!;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  if (!isUpstashConfigured) {
    return inMemoryLimit(key, limit, windowMs);
  }

  try {
    const configKey = `${limit}:${windowMs}`;
    const limiter = getUpstashLimiter(configKey, limit, windowMs);
    const result = await limiter.limit(key);
    return {
      allowed: result.success,
      remaining: result.remaining,
      resetInMs: Math.max(0, result.reset - Date.now()),
    };
  } catch {
    // Qualquer falha do Upstash (erro/timeout) degrada para o limitador
    // in-memory desta instância — nunca lança nem trava a requisição.
    return inMemoryLimit(key, limit, windowMs);
  }
}

export const limiters = {
  /**
   * 50 attempts per IP per 15 minutes — coarse anti-abuse guard for the login endpoint.
   * Kept deliberately high because legitimate users frequently share a public IP (parish/
   * community Wi-Fi, mobile carrier CGNAT). Per-account brute-force protection is provided
   * by `loginPerEmail` + account lockout, not by this IP limit.
   */
  login: (ip: string) => rateLimit(`login:${ip}`, 50, 15 * 60 * 1000),

  /** 3 new accounts per IP per hour — registration. */
  register: (ip: string) => rateLimit(`register:${ip}`, 3, 60 * 60 * 1000),

  /** 20 uploads per user per hour. */
  upload: (userId: string) => rateLimit(`upload:${userId}`, 20, 60 * 60 * 1000),

  /** 5 email sends per user per hour — password reset, invites. */
  email: (userId: string) => rateLimit(`email:${userId}`, 5, 60 * 60 * 1000),

  /** 3 SMTP test emails per user per hour — admin config. */
  smtpTest: (userId: string) => rateLimit(`smtp_test:${userId}`, 3, 60 * 60 * 1000),

  /** 60 write operations per user per minute — general POST/PUT/DELETE protection. */
  mutation: (userId: string) => rateLimit(`mutation:${userId}`, 60, 60 * 1000),

  /** 5 data exports per user per hour — prevents bulk data harvesting. */
  export: (userId: string) => rateLimit(`export:${userId}`, 5, 60 * 60 * 1000),

  /** 10 invite acceptances per IP per hour — prevents bulk account creation. */
  conviteAccept: (ip: string) => rateLimit(`convite_accept:${ip}`, 10, 60 * 60 * 1000),

  /** 3 password change attempts per user per hour. */
  passwordChange: (userId: string) => rateLimit(`pwd_change:${userId}`, 3, 60 * 60 * 1000),

  /** 5 MFA operations per user per hour (enable, disable, setup). Separate from passwordChange to avoid shared quota exhaustion. */
  mfa: (userId: string) => rateLimit(`mfa:${userId}`, 5, 60 * 60 * 1000),

  /** 10 login attempts per email per 30 minutes — account-level brute-force protection. */
  loginPerEmail: (email: string) => rateLimit(`login_email:${email.toLowerCase()}`, 10, 30 * 60 * 1000),

  /**
   * 30 consultas de branding por e-mail por IP em 15 min — resolve a identidade visual
   * da org no login em 2 passos. Throttle de enumeração: o endpoint revela (por design)
   * a marca associada a um e-mail; o limite por IP encarece varreduras em massa sem
   * atrapalhar o uso legítimo (usuário digita/corrige o e-mail poucas vezes).
   */
  brandingLookup: (ip: string) => rateLimit(`branding_lookup:${ip}`, 30, 15 * 60 * 1000),

  /** 10 bulk operations per super admin per minute — prevents rapid-fire bulk mutations. */
  superAdminBulk: (userId: string) => rateLimit(`sa_bulk:${userId}`, 10, 60 * 1000),

  /** 3 mass email sends per super admin per hour — prevents accidental email storms. */
  superAdminComunicado: (userId: string) => rateLimit(`sa_comunicado:${userId}`, 3, 60 * 60 * 1000),

  /** 5 trial reminder triggers per super admin per hour. */
  superAdminTrialReminder: (userId: string) => rateLimit(`sa_trial_reminder:${userId}`, 5, 60 * 60 * 1000),

  /** 3 pedidos de reset por e-mail por 15 minutos — portal do formando. */
  portalRecuperar: (email: string) => rateLimit(`portal_reset:${email.toLowerCase()}`, 3, 15 * 60 * 1000),

  /** 10 pedidos de reset por IP por 15 minutos — segunda camada, bloqueia rotação de e-mails. */
  portalRecuperarIp: (ip: string) => rateLimit(`portal_reset_ip:${ip}`, 10, 15 * 60 * 1000),

  /** 50 login attempts per IP per 15 minutes — portal do formando (senha). */
  portalLogin: (ip: string) => rateLimit(`portal_login:${ip}`, 50, 15 * 60 * 1000),

  /** 10 login attempts per email per 30 minutes — brute-force por conta (portal). */
  portalLoginEmail: (email: string) => rateLimit(`portal_login_email:${email.toLowerCase()}`, 10, 30 * 60 * 1000),

  /** 10 tentativas de ativação/definição de senha por IP por hora — portal. */
  portalAtivacao: (ip: string) => rateLimit(`portal_ativacao:${ip}`, 10, 60 * 60 * 1000),

  /** 5 cadastros de lead por IP por hora — captura na landing (anti-abuso). */
  leadSubscribeIp: (ip: string) => rateLimit(`lead_sub_ip:${ip}`, 5, 60 * 60 * 1000),

  /** 3 cadastros por e-mail por hora — segunda camada, evita reenvio em massa. */
  leadSubscribeEmail: (email: string) => rateLimit(`lead_sub_email:${email.toLowerCase()}`, 3, 60 * 60 * 1000),
};
