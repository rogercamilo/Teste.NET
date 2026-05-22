/**
 * In-memory sliding-window rate limiter.
 * Phase 4 will replace the store with Redis (Upstash) — only the store changes,
 * the interface and call-sites remain identical.
 */

interface Entry {
  count: number;
  windowStart: number;
  windowMs: number;
}

const store = new Map<string, Entry>();

// Lazy cleanup: removes only genuinely expired entries regardless of which
// limiter triggers it, avoiding premature eviction of longer-window entries.
function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= entry.windowMs) store.delete(key);
  }
}

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000; // every 5 min

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
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
    return {
      allowed: false,
      remaining: 0,
      resetInMs: windowMs - (now - entry.windowStart),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetInMs: windowMs - (now - entry.windowStart),
  };
}

/** Pre-configured limiters for common scenarios. */
export const limiters = {
  /** 5 attempts per IP per 15 minutes — login endpoint. */
  login: (ip: string) => rateLimit(`login:${ip}`, 5, 15 * 60 * 1000),

  /** 3 new accounts per IP per hour — registration. */
  register: (ip: string) => rateLimit(`register:${ip}`, 3, 60 * 60 * 1000),

  /** 20 uploads per user per hour. */
  upload: (userId: string) => rateLimit(`upload:${userId}`, 20, 60 * 60 * 1000),

  /** 5 email sends per user per hour — password reset, invites. */
  email: (userId: string) => rateLimit(`email:${userId}`, 5, 60 * 60 * 1000),

  /** 3 SMTP test emails per user per hour — admin config. */
  smtpTest: (userId: string) => rateLimit(`smtp_test:${userId}`, 3, 60 * 60 * 1000),
};
