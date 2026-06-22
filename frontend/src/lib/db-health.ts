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
