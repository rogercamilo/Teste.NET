import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/audit-log";
import { listarNaoLidas, marcarTodasLidas } from "@/lib/notificacoes";
import type { SessionUser } from "@/lib/auth-helpers";

export async function GET() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const notificacoes = await listarNaoLidas(user.id);
    return NextResponse.json(notificacoes);
  } catch (err) {
    logError("notificacoes GET", err);
    return NextResponse.json({ error: "Falha ao listar notificações" }, { status: 500 });
  }
}

// PATCH sem body → marca todas como lidas
export async function PATCH() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    await marcarTodasLidas(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("notificacoes PATCH all", err);
    return NextResponse.json({ error: "Falha ao atualizar notificações" }, { status: 500 });
  }
}
