import { defineConfig, env } from "prisma/config";

// Prisma 7: a conexão e o comando de seed saem do schema/package.json e passam a
// viver aqui. A CLI (migrate/generate) usa `datasource.url`; o runtime da app usa
// o driver adapter (`@prisma/adapter-pg`) em `src/lib/prisma.ts`.
// DATABASE_URL vem do ambiente (shell/CI/Railway) — Prisma NÃO lê `.env.local`.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
