import { NextResponse } from "next/server";
import { confirmLead } from "@/lib/leads-store";
import { logError } from "@/lib/audit-log";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Confirma o double opt-in via link do e-mail (GET, 1 clique). Redireciona para
 * a página de obrigado (entrega do eBook) em sucesso, ou com `?status=invalido`
 * quando o token não é reconhecido.
 */
export async function GET(request: Request) {
  const base = APP_URL.replace(/\/+$/, "");
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(`${base}/materiais/obrigado?status=invalido`);
  }
  try {
    const res = await confirmLead(token);
    const status = res.ok ? "confirmado" : "invalido";
    return NextResponse.redirect(`${base}/materiais/obrigado?status=${status}`);
  } catch (err) {
    logError("leads/confirm GET", err);
    return NextResponse.redirect(`${base}/materiais/obrigado?status=erro`);
  }
}
