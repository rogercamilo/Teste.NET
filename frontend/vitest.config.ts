import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": "/src",
      // `server-only` não é resolível no ambiente node do Vitest — stub vazio.
      "server-only": "/src/__tests__/stubs/server-only.ts",
    },
  },
  test: {
    environment: "node",
    // Os testes e2e (Playwright) usam seu próprio runner — não devem ser
    // coletados pelo Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      // json-summary alimenta o gate de regressão de cobertura no CI (coverage-diff).
      reporter: ["text", "json-summary"],
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
