import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUser, deleteUser, toPublic } from "@/lib/users-store";
import { logAction, getClientIp } from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };
type SessionUser = { id?: string; role?: string; organizacaoId?: string };

function isAdminOrAbove(role: string | undefined): boolean {
  return role === "administrador" || role === "formador_geral" || role === "super_admin";
}

export async function PUT(request: Request, ctx: Ctx) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;

  if (!actor) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!isAdminOrAbove(actor.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await request.json() as Record<string, unknown>;

    if (body.perfil === "formador_geral") {
      return NextResponse.json(
        { error: "Não é permitido atribuir o perfil Formador Geral por esta rota" },
        { status: 403 }
      );
    }

    const updated = await updateUser(id, { ...body, organizacaoId: actor.organizacaoId });
    if (!updated) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    logAction("user_updated", actor.id, getClientIp(request), { targetId: id }, actor.organizacaoId);
    return NextResponse.json(toPublic(updated));
  } catch (err) {
    console.error("[api]", err);
    return NextResponse.json({ error: "Falha ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;

  if (!actor) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!isAdminOrAbove(actor.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;

    if (id === actor.id) {
      return NextResponse.json(
        { error: "Não é possível excluir a própria conta por esta rota" },
        { status: 400 }
      );
    }

    const ok = await deleteUser(id, actor.organizacaoId);
    if (!ok) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    logAction("user_deleted", actor.id, getClientIp(request), { targetId: id }, actor.organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api]", err);
    return NextResponse.json({ error: "Falha ao excluir usuário" }, { status: 500 });
  }
}
