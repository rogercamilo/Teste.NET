import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDbConnectionStats, DB_POOL_ALERT_THRESHOLD } from "@/lib/db-health";
import { sendDbPoolAlertEmail } from "@/lib/email";
import { logAction, logError } from "@/lib/audit-log";

// Não envia novo alerta enquanto houver um nas últimas 6h, mesmo que a condição persista.
const ALERT_THROTTLE_MS = 6 * 60 * 60 * 1000;

// Autoriza o scheduler via CRON_SECRET (Bearer). Comparação em tempo constante.
function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: Request) {
  // Aceita o cron (CRON_SECRET) OU um super_admin logado (trigger manual / teste).
  let authorized = isAuthorizedCron(request);
  if (!authorized) {
    const session = await auth();
    authorized = session?.user?.role === "super_admin";
  }
  if (!authorized) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const stats = await getDbConnectionStats();
    if (!stats) return NextResponse.json({ error: "Métrica indisponível" }, { status: 503 });

    const breached = stats.percentUso >= DB_POOL_ALERT_THRESHOLD;
    let alertSent = false;

    if (breached) {
      // Anti-spam: estado do último alerta persistido no próprio AuditLog (sem tabela nova).
      const lastAlert = await prisma.auditLog.findFirst({
        where: { acao: "db_pool_alert" },
        orderBy: { criadoEm: "desc" },
        select: { criadoEm: true },
      });
      const recentlyAlerted =
        !!lastAlert && Date.now() - lastAlert.criadoEm.getTime() < ALERT_THROTTLE_MS;

      if (!recentlyAlerted) {
        const superAdmins = await prisma.usuario.findMany({
          where: { perfil: "super_admin", ativo: true, deletedAt: null },
          select: { email: true, nome: true, organizacaoId: true },
        });
        const appUrl = process.env.NEXTAUTH_URL ?? "https://www.formattio.com.br";
        let sent = 0;
        for (const sa of superAdmins) {
          const r = await sendDbPoolAlertEmail({
            organizacaoId: sa.organizacaoId,
            email: sa.email,
            nome: sa.nome,
            percentUso: stats.percentUso,
            total: stats.total,
            max: stats.max,
            appUrl,
          });
          if (r.sent) sent++;
        }
        logAction("db_pool_alert", undefined, undefined, {
          percentUso: stats.percentUso,
          total: stats.total,
          max: stats.max,
          recipients: sent,
        });
        alertSent = true;
      }
    }

    return NextResponse.json({ ...stats, breached, alertSent });
  } catch (err) {
    logError("cron/db-health", err);
    return NextResponse.json({ error: "Falha na verificação" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
