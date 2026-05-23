import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": "/src" } },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text"],
      include: [
        "src/lib/pagination.ts",
        "src/lib/password-validation.ts",
        "src/lib/audit-log.ts",
        "src/lib/plan-limits.ts",
        "src/lib/rate-limit.ts",
        "src/lib/tenant-context.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        // branches 75 — Upstash path in rate-limit.ts untestável sem credenciais reais
        branches: 75,
      },
    },
  },
});
