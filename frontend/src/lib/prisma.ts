import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as { prisma?: PrismaClient };

// Prisma 7 usa driver adapters: a conexão é gerida pelo pool do `pg` (não mais
// pela URL do engine Rust). DATABASE_POOL_SIZE vira o `max` do pool (Railway = 5);
// antes ia como `connection_limit` na URL. Sem DATABASE_URL, não cria adapter
// (o client só é instanciado quando há banco — em runtime real sempre há).
function createAdapter(): PrismaPg | undefined {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;
  const poolSize = process.env.DATABASE_POOL_SIZE;
  return new PrismaPg({
    connectionString,
    ...(poolSize ? { max: Number(poolSize) } : {}),
    // Fail-fast na conexão TCP (preserva a intenção do antigo pool_timeout=10s):
    // I/O de rede no hot path não pode travar indefinidamente.
    connectionTimeoutMillis: 10_000,
  });
}

const adapter = createAdapter();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(adapter ? { adapter } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
