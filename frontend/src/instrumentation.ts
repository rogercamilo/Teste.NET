import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Env var validation — cannot run on edge (imports Prisma-dependent modules)
    await import("./env");
    await import("../sentry.server.config");

    // Aquece o pool do Prisma no boot, ANTES do primeiro health check / requisição.
    // Numa instância recém-iniciada (todo deploy/restart), a primeira query pagaria a
    // latência de abrir a conexão; disparando um SELECT 1 aqui a conexão já está pronta
    // quando o /api/health (e o primeiro login) chegam, reduzindo o tempo-até-saudável.
    // Best-effort: falha não pode derrubar o boot (o health check reporta o estado real).
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      // Banco ainda indisponível no boot — segue; o health check refletirá isso.
    }
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Captures errors thrown inside Server Components and Route Handlers automatically.
// Required in Next.js 15+ — without this, server-side request errors are silent in Sentry.
export const onRequestError = Sentry.captureRequestError;
