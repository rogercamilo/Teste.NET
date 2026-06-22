import { defineConfig } from "@playwright/test";

// E2E roda contra o servidor de desenvolvimento (npm run dev). Em produção o
// NextAuth usa cookies "secure", que não trafegam sobre http://localhost — por
// isso os fluxos de autenticação são validados em modo dev (cookies não-secure).
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Aquece rotas/APIs no servidor dev antes da suíte (evita estouro de timeout
  // na primeira compilação sob demanda do Turbopack).
  globalSetup: "./e2e/global-setup.ts",
  // Fluxos compartilham o mesmo banco e servidor dev; serial evita corrida e
  // recompilação concorrente de rotas pelo Turbopack.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Generoso para absorver a compilação sob demanda do dev server em runners de CI.
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      // browserName explícito garante o chromium empacotado pelo Playwright
      // (não depende do Google Chrome instalado na máquina).
      use: { browserName: "chromium", viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
