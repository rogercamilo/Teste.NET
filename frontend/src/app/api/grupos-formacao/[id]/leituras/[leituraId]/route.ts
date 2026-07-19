import { NextResponse } from "next/server";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { UpdateLeituraSchema, parseJson } from "@/lib/schemas";
import { updateLeitura, deleteLeitura } from "@/lib/leituras-store";
import { requireGrupoLeituraAccess } from "../access";

type Params = { params: Promise<{ id: string; leituraId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, leituraId } = await params;
  const guard = await requireGrupoLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { user, organizacaoId, turmaId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const parsed = await parseJson(request, UpdateLeituraSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { titulo, autor, capaUrl, ordem, ativo, capitulos } = parsed.data;

    // Escopo por grupo + org dentro do store: nunca confia no id cru (evita IDOR).
    const atualizada = await updateLeitura(turmaId, organizacaoId, leituraId, { titulo, autor, capaUrl, ordem, ativo, capitulos });
    if (!atualizada) return NextResponse.json({ error: "Leitura não encontrada" }, { status: 404 });

    logAction("grupo_leitura_editada", user.id, getClientIp(request), { grupoId: turmaId, leituraId }, organizacaoId);
    return NextResponse.json(atualizada);
  } catch (err) {
    logError("grupo leitura PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar leitura" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id, leituraId } = await params;
  const guard = await requireGrupoLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { user, organizacaoId, turmaId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const removida = await deleteLeitura(turmaId, organizacaoId, leituraId);
    if (!removida) return NextResponse.json({ error: "Leitura não encontrada" }, { status: 404 });

    logAction("grupo_leitura_removida", user.id, getClientIp(request), { grupoId: turmaId, leituraId }, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("grupo leitura DELETE", err);
    return NextResponse.json({ error: "Falha ao remover leitura" }, { status: 500 });
  }
}
