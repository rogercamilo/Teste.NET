/**
 * Centralized environment variable validation.
 * Fails fast at startup with a clear, actionable error message.
 * Server-side only — never import this from client components.
 */

import { z } from "zod";

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    // Core — required
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((v) => v.startsWith("postgresql://") || v.startsWith("postgres://"), {
        message: "DATABASE_URL must start with postgresql:// or postgres://",
      }),
    DEFAULT_ORG_ID: z.string().min(1, "DEFAULT_ORG_ID must not be empty"),

    // Application URL
    NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),

    // Node environment
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // Google OAuth — optional; if one is set, both are required
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // SMTP — optional; all-or-nothing check done in superRefine below
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
    SMTP_SECURE: z
      .string()
      .optional()
      .transform((v) => v === "true"),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // Resend (alternative transactional email)
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM: z.string().default("contato@formattio.com.br"),

    // Cloudflare R2 — optional; all four required if any is set
    R2_ACCOUNT_ID: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),

    // Upstash Redis — optional; both required if either is set
    UPSTASH_REDIS_REST_URL: z
      .string()
      .url("UPSTASH_REDIS_REST_URL must be a valid URL")
      .optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // Field-level encryption key — optional but strongly recommended in production
    // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    APP_ENCRYPTION_KEY: z
      .string()
      .regex(/^[0-9a-fA-F]{64}$/, "APP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)")
      .optional(),

    // Reverse proxy trust — only set to "true" when the app is behind a trusted reverse proxy.
    // Setting this to any other value (e.g. "yes", "1") is treated as false.
    TRUST_PROXY: z.enum(["true", "false"]).optional(),

    // Stripe — optional
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_BASICO: z.string().optional(),
    STRIPE_PRICE_INTERMEDIARIO: z.string().optional(),
    STRIPE_PRICE_AVANCADO: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Google OAuth: partial config is a misconfiguration
    const hasGoogleId = !!data.GOOGLE_CLIENT_ID;
    const hasGoogleSecret = !!data.GOOGLE_CLIENT_SECRET;
    if (hasGoogleId !== hasGoogleSecret) {
      const missing = hasGoogleId ? "GOOGLE_CLIENT_SECRET" : "GOOGLE_CLIENT_ID";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [missing],
        message: `${missing} must be set when the other Google OAuth variable is configured`,
      });
    }

    // R2: all-or-nothing
    const r2Vars = ["R2_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"] as const;
    const r2Set = r2Vars.filter((k) => !!data[k]);
    if (r2Set.length > 0 && r2Set.length < r2Vars.length) {
      const missing = r2Vars.filter((k) => !data[k]);
      for (const key of missing) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be set when other R2 variables are configured`,
        });
      }
    }

    // Upstash: both required if either is set
    const hasUpstashUrl = !!data.UPSTASH_REDIS_REST_URL;
    const hasUpstashToken = !!data.UPSTASH_REDIS_REST_TOKEN;
    if (hasUpstashUrl !== hasUpstashToken) {
      const missing = hasUpstashUrl ? "UPSTASH_REDIS_REST_TOKEN" : "UPSTASH_REDIS_REST_URL";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [missing],
        message: `${missing} must be set when the other Upstash variable is configured`,
      });
    }

    // APP_ENCRYPTION_KEY required in production — field-level encryption protects SMTP credentials and other secrets at rest
    if (data.NODE_ENV === "production" && !data.APP_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["APP_ENCRYPTION_KEY"],
        message: "APP_ENCRYPTION_KEY is required in production for field-level encryption",
      });
    }

    // NEXTAUTH_URL required in production for host validation and redirect URL generation
    if (data.NODE_ENV === "production" && !data.NEXTAUTH_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["NEXTAUTH_URL"],
        message: "NEXTAUTH_URL is required in production",
      });
    }

    // Upstash required in production — in-memory rate limiting is per-process and bypassed
    // in multi-worker deployments (Vercel, Railway), making login brute-force limits ineffective.
    if (data.NODE_ENV === "production" && (!hasUpstashUrl || !hasUpstashToken)) {
      for (const key of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"] as const) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message: `${key} is required in production for distributed rate limiting`,
          });
        }
      }
    }
  });

// ── Validation ───────────────────────────────────────────────────────────────

function validateEnv() {
  // Convert empty strings to undefined so optional() works correctly with .env files
  const raw = Object.fromEntries(
    Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v])
  );
  const result = schema.safeParse(raw);

  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  • ${issue.path.join(".")}: ${issue.message}`
    );
    console.error(
      "\n┌─────────────────────────────────────────────────────┐\n" +
        "│  ERRO: variáveis de ambiente inválidas ou ausentes  │\n" +
        "└─────────────────────────────────────────────────────┘\n" +
        lines.join("\n") +
        "\n\nVerifique frontend/.env.local e tente novamente.\n"
    );
    throw new Error("Invalid environment variables — see above for details.");
  }

  return result.data;
}

export const env = validateEnv();

export type Env = typeof env;
