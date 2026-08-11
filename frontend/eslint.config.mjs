import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";

// ⚠️ LINT DE TS/TSX TEMPORARIAMENTE DESLIGADO (TypeScript 7 — native port)
// ---------------------------------------------------------------------------
// O TypeScript 7 é a porta nativa (Go) e NÃO expõe a API JS do compilador
// (`ts.createProgram`, `ts.Extension`, `ts.ModuleKind` = undefined). Toda a
// stack de lint de TypeScript no ESLint depende dessa API via `typescript-eslint`,
// que é também o PARSER de .ts/.tsx. Sob a porta nativa ela quebra já no import
// (`ts.Extension.Cjs`), e nenhuma versão de typescript-eslint suporta TS 7 ainda
// (peer travado em `typescript <6.1.0`, inclusive canary).
//
// Consequência: com TS 7, o ESLint não consegue nem PARSEAR .ts/.tsx. Por isso
// `eslint-config-next` (core-web-vitals + typescript) foi removido — importá-lo
// quebra o processo — e os arquivos TS/TSX estão em `globalIgnores`. O typecheck
// segue coberto por `tsc --noEmit` (CI) e a build por `next build`.
//
// PARA RESTAURAR o lint completo de TS quando typescript-eslint suportar a porta
// nativa: `npm i -D eslint-config-next@latest` (foi desinstalado), reintroduzir
// os imports `eslint-config-next/core-web-vitals` e `eslint-config-next/typescript`,
// remover o ignore de `**/*.{ts,tsx}` e as regras customizadas abaixo, voltando ao
// spread `...nextVitals, ...nextTs`.
const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**/*.mjs",
    "public/**/*.min.js",
    // TS/TSX não são parseáveis sob a porta nativa do TS 7 (ver nota acima).
    "**/*.ts",
    "**/*.tsx",
    "**/*.mts",
    "**/*.cts",
  ]),
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    ...js.configs.recommended,
  },
  {
    // Os arquivos .js/.mjs do projeto são scripts Node (scripts/*.mjs) e configs;
    // alguns dirigem Playwright e embutem código de browser em `page.evaluate()`,
    // por isso os globals de browser também entram.
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // Prefixo `_` marca "intencionalmente não usado" (convenção padrão do
      // projeto): permite descartar args/vars sem virar ruído no lint.
      "no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // `catch {}` vazio é padrão intencional no código (fail-open silencioso).
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // Service worker (Web Push): roda no ServiceWorkerGlobalScope.
    files: ["public/sw.js"],
    languageOptions: {
      globals: { ...globals.serviceworker },
    },
  },
]);

export default eslintConfig;
