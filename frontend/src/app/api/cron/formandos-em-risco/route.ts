import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { auth } from "@/auth";
import { checkFormandosEmRisco } from "@/lib/risco-formandos";
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
    const summary = await checkFormandosEmRisco();
    if (summary.alertados > 0 || summary.recuperados > 0) {
      logAction("formandos_risco_alertados", undefined, undefined, {
        alertados: summary.alertados,
        recuperados: summary.recuperados,
        gruposNotificados: summary.gruposNotificados,
        emails: summary.emails,
      });
    }
    return NextResponse.json(summary);
  } catch (err) {
    logError("cron/formandos-em-risco", err);
    return NextResponse.json({ error: "Falha ao verificar formandos em risco" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
