/**
 * Saúde do pool de conexões do PostgreSQL.
 * Usado pelo cockpit do super admin (indicador visual) e pelo cron de alerta proativo.
 */
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";

export interface DbConnectionStats {
  total: number;
  ativas: number;
  ociosas: number;
  max: number;
  percentUso: number;
}

export interface SlowQuery {
  /** Texto normalizado da query (literais já viram $1… — sem PII). Truncado. */
  query: string;
  calls: number;
  meanMs: number;
  totalMs: number;
  rows: number;
}

export interface SlowQueriesResult {
  /** false quando pg_stat_statements não está disponível (não pré-carregado). */
  available: boolean;
  queries: SlowQuery[];
}

/** Limiar (%) a partir do qual o pool é considerado em risco e dispara alerta/aviso de pooler. */
export const DB_POOL_ALERT_THRESHOLD = 80;

/**
 * Lê pg_stat_activity (apenas conexões de cliente, não background workers) e compara com
 * max_connections. Retorna null se a query falhar — chamadores tratam como "indisponível"
 * sem quebrar o fluxo.
 */
export async function getDbConnectionStats(): Promise<DbConnectionStats | null> {
  try {
    const rows = await prisma.$queryRaw<
      { max: number; total: number; ativas: number; ociosas: number }[]
    >`
      SELECT
        current_setting('max_connections')::int AS max,
        count(*)::int AS total,
        count(*) FILTER (WHERE state = 'active')::int AS ativas,
        count(*) FILTER (WHERE state = 'idle')::int AS ociosas
      FROM pg_stat_activity
      WHERE backend_type = 'client backend'
    `;
    const r = rows[0];
    if (!r) return null;
    return {
      total: r.total,
      ativas: r.ativas,
      ociosas: r.ociosas,
      max: r.max,
      percentUso: r.max > 0 ? Math.round((r.total / r.max) * 100) : 0,
    };
  } catch (err) {
    logError("db-health/getDbConnectionStats", err);
    return null;
  }
}

/**
 * Top queries por custo agregado (pg_stat_statements). Ferramenta de
 * diagnóstico do super-admin para transformar suposições de lentidão em
 * números — casa com as spans de query do Prisma no Sentry.
 *
 * A extensão precisa estar em `shared_preload_libraries` (config do servidor).
 * Se não estiver, `CREATE EXTENSION` falha e devolvemos `available: false` sem
 * quebrar o painel. As queries vêm normalizadas (literais → $1), sem PII.
 */
export async function getTopSlowQueries(limit = 12): Promise<SlowQueriesResult> {
  const run = () =>
    prisma.$queryRaw<
      { query: string; calls: number; meanMs: number; totalMs: number; rows: number }[]
    >`
      SELECT
        left(query, 200)                       AS query,
        calls::int                             AS calls,
        round(mean_exec_time::numeric, 2)::float8  AS "meanMs",
        round(total_exec_time::numeric, 2)::float8 AS "totalMs",
        rows::int                              AS rows
      FROM pg_stat_statements
      WHERE query NOT ILIKE '%pg_stat_statements%'
        AND query NOT ILIKE '%pg_stat_activity%'
        AND query NOT ILIKE 'SET %'
        AND query NOT ILIKE 'SHOW %'
        AND query NOT ILIKE 'COMMIT%'
        AND query NOT ILIKE 'BEGIN%'
      ORDER BY total_exec_time DESC
      LIMIT ${limit}
    `;

  try {
    return { available: true, queries: await run() };
  } catch {
    // Talvez a extensão ainda não exista nesta base — tenta criar (idempotente).
    try {
      await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pg_stat_statements");
      return { available: true, queries: await run() };
    } catch (err) {
      // Não pré-carregado em shared_preload_libraries (ou sem privilégio).
      logError("db-health/getTopSlowQueries", err);
      return { available: false, queries: [] };
    }
  }
}
