export async function register() {
  // Validate env vars once at server startup (Node.js runtime only).
  // Edge runtime (proxy/middleware) skips this — it cannot import Prisma-dependent modules.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./env");
  }
}
