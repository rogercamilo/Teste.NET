import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import { checkAndSendReminders } from "@/lib/agendamento-reminders";
import { logAction, logError } from "@/lib/audit-log";

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
    const summary = await checkAndSendReminders();
    if (summary.agendamentos > 0) {
      logAction("agendamento_reminders_sent", undefined, undefined, {
        agendamentos: summary.agendamentos,
        emails: summary.emails,
        push: summary.push,
      });
    }
    return NextResponse.json(summary);
  } catch (err) {
    logError("cron/agendamento-reminders", err);
    return NextResponse.json({ error: "Falha ao enviar lembretes" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
