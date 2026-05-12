import { NextResponse } from "next/server";
import { updateUser, deleteUser, toPublic } from "@/lib/users-store";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const body = await request.json() as Record<string, unknown>;
    const updated = updateUser(id, body);
    if (!updated) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    return NextResponse.json(toPublic(updated));
  } catch {
    return NextResponse.json({ error: "Falha ao atualizar usuário" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const ok = deleteUser(id);
    if (!ok) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Falha ao excluir usuário" }, { status: 500 });
  }
}
