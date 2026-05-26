import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Env var validation — cannot run on edge (imports Prisma-dependent modules)
    await import("./env");
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Captures errors thrown inside Server Components and Route Handlers automatically.
// Required in Next.js 15+ — without this, server-side request errors are silent in Sentry.
export const onRequestError = Sentry.captureRequestError;
