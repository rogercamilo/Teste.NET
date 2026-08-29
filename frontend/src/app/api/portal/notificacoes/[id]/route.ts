import { NextResponse } from "next/server";
import { logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { marcarLidaFormando } from "@/lib/notificacoes";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Marca UMA notificação do formando como lida. Escopado ao par
 * (formandoId, organizacaoId) dos headers do proxy — anti-IDOR: o updateMany não
 * afeta nada se o id não pertencer a este formando.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const { id } = await params;
    await marcarLidaFormando(id, formandoId, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal notificacoes/[id] PATCH", err);
    return NextResponse.json({ error: "Falha ao marcar notificação" }, { status: 500 });
  }
}
