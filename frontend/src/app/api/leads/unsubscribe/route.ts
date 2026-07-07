import { NextResponse } from "next/server";
import { unsubscribeLead } from "@/lib/leads-store";
import { logError } from "@/lib/audit-log";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/**
 * Descadastro 1-clique via link do rodapé dos e-mails (GET). Idempotente;
 * redireciona sempre para a página de confirmação de descadastro.
 */
export async function GET(request: Request) {
  const base = APP_URL.replace(/\/+$/, "");
  const token = new URL(request.url).searchParams.get("token");
  if (token) {
    try {
      await unsubscribeLead(token);
    } catch (err) {
      logError("leads/unsubscribe GET", err);
    }
  }
  return NextResponse.redirect(`${base}/materiais/descadastro`);
}
