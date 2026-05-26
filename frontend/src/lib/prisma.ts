import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

// Pool size via DATABASE_POOL_SIZE env var (default: 10 for servers, set to 1-3 for serverless/Vercel).
// Append to DATABASE_URL: ?connection_limit=N&pool_timeout=10
// If the env var is set here, it overrides what's in the URL.
function buildDatabaseUrl(): string | undefined {
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  const poolSize = process.env.DATABASE_POOL_SIZE;
  if (!poolSize || base.includes("connection_limit")) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}connection_limit=${poolSize}&pool_timeout=10`;
}

const datasourceUrl = buildDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
