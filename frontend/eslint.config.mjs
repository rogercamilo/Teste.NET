import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/**/*.mjs",
    "public/**/*.min.js",
  ]),
  {
    rules: {
      // Pre-existing issues — downgraded to warn so CI reports but doesn't block.
      // Track resolution in: https://github.com/rogercamilo/Teste.NET/issues
      "react/no-unescaped-entities": "warn",
      "@next/next/no-img-element": "warn",
      // Prefixo `_` marca "intencionalmente não usado" (convenção padrão do
      // TS-ESLint): permite descartar args/vars sem virar ruído no lint.
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
