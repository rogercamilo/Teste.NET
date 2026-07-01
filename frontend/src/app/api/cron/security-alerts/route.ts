import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { checkSecurityEvents, SECURITY_WINDOW_MINUTES } from "@/lib/security-monitor";
import { sendSecurityAlertEmail } from "@/lib/email";
import { logAction, logError } from "@/lib/audit-log";

// Não envia novo alerta enquanto houver um nas últimas 3h, mesmo que a condição persista.
const ALERT_THROTTLE_MS = 3 * 60 * 60 * 1000;

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
    const signals = await checkSecurityEvents();
    let alertSent = false;

    if (signals.length > 0) {
      // Anti-spam: estado do último alerta persistido no próprio AuditLog (sem tabela nova).
      const lastAlert = await prisma.auditLog.findFirst({
        where: { acao: "security_alert_sent" },
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
          const r = await sendSecurityAlertEmail({
            organizacaoId: sa.organizacaoId,
            email: sa.email,
            nome: sa.nome,
            signals,
            windowMinutes: SECURITY_WINDOW_MINUTES,
            appUrl,
          });
          if (r.sent) sent++;
        }
        logAction("security_alert_sent", undefined, undefined, {
          signals: signals.map((s) => ({ acao: s.acao, count: s.count, threshold: s.threshold })),
          recipients: sent,
        });
        alertSent = true;
      }
    }

    return NextResponse.json({ signals, alertSent, windowMinutes: SECURITY_WINDOW_MINUTES });
  } catch (err) {
    logError("cron/security-alerts", err);
    return NextResponse.json({ error: "Falha na verificação" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
