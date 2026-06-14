import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/audit-log";
import { marcarLida } from "@/lib/notificacoes";
import type { SessionUser } from "@/lib/auth-helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Ctx) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;
    await marcarLida(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("notificacoes/[id] PATCH", err);
    return NextResponse.json({ error: "Falha ao marcar notificação" }, { status: 500 });
  }
}
