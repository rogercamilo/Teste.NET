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

/**
 * Descadastro 1-clique RFC 8058: Gmail/Yahoo fazem POST direto na URL do
 * cabeçalho `List-Unsubscribe` (com `List-Unsubscribe-Post: List-Unsubscribe=One-Click`).
 * Sem interação do usuário — apenas processa o token e responde 200.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (token) {
    try {
      await unsubscribeLead(token);
    } catch (err) {
      logError("leads/unsubscribe POST", err);
    }
  }
  return new NextResponse(null, { status: 200 });
}
