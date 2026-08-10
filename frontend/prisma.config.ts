import { defineConfig } from "prisma/config";

// Prisma 7: a conexão e o comando de seed saem do schema/package.json e passam a
// viver aqui. A CLI (migrate/generate) usa `datasource.url`; o runtime da app usa
// o driver adapter (`@prisma/adapter-pg`) em `src/lib/prisma.ts`.
// DATABASE_URL vem do ambiente (shell/CI/Railway) — Prisma NÃO lê `.env.local`.
//
// NÃO usamos `env("DATABASE_URL")` de `prisma/config`: ele é avaliado no LOAD do
// config e LANÇA se a var faltar — mas `prisma generate` não precisa de banco, e
// os jobs de lint/typecheck/coverage do CI rodam generate sem DATABASE_URL. O
// fallback (nunca usado p/ conectar; migrate/deploy sempre têm DATABASE_URL real)
// deixa o generate rodar sem exigir a var.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/_generate_only";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
