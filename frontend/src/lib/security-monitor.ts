/**
 * Monitor de eventos de segurança em runtime.
 * Usado pelo cron de alerta proativo (`/api/cron/security-alerts`): agrega no
 * AuditLog os sinais de "ataque em andamento" numa janela recente e dispara
 * alerta quando algum cruza o limiar. Espelha o padrão do db-health.
 */
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";

/** Janela de observação (min) — casa com o intervalo do cron. */
export const SECURITY_WINDOW_MINUTES = 15;

/**
 * Ações do AuditLog monitoradas e o nº de ocorrências na janela que dispara alerta.
 * Valores calibrados para tráfego baixo (pré-lançamento); ajustar conforme escala.
 */
export const SECURITY_THRESHOLDS: Record<string, number> = {
  login_failure: 20, // brute force / credential stuffing
  login_blocked: 15, // rate-limit / lockout batendo com força
  upload_rejected_malware: 5, // sondagem de upload malicioso
};

/** Rótulos legíveis para o e-mail de alerta. */
export const SECURITY_LABELS: Record<string, string> = {
  login_failure: "Falhas de login",
  login_blocked: "Tentativas de login bloqueadas",
  upload_rejected_malware: "Uploads maliciosos rejeitados",
};

export interface SecuritySignal {
  acao: string;
  label: string;
  count: number;
  threshold: number;
}

/**
 * Conta as ações monitoradas na janela e devolve as que cruzaram o limiar.
 * Retorna [] se não houver anomalia (ou em falha — não quebra o cron).
 */
export async function checkSecurityEvents(
  windowMinutes = SECURITY_WINDOW_MINUTES
): Promise<SecuritySignal[]> {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const acoes = Object.keys(SECURITY_THRESHOLDS);
  try {
    const grouped = await prisma.auditLog.groupBy({
      by: ["acao"],
      where: { acao: { in: acoes }, criadoEm: { gte: since } },
      _count: { _all: true },
    });
    const signals: SecuritySignal[] = [];
    for (const g of grouped) {
      const threshold = SECURITY_THRESHOLDS[g.acao];
      const count = g._count._all;
      if (threshold && count >= threshold) {
        signals.push({ acao: g.acao, label: SECURITY_LABELS[g.acao] ?? g.acao, count, threshold });
      }
    }
    // Maior desvio primeiro.
    signals.sort((a, b) => b.count / b.threshold - a.count / a.threshold);
    return signals;
  } catch (err) {
    logError("security-monitor/checkSecurityEvents", err);
    return [];
  }
}
