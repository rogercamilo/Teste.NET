import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { SessionUser as SU } from "@/lib/auth-helpers";
import { parseJson } from "@/lib/schemas";
import { logError } from "@/lib/audit-log";
import { updateDepoimento, deleteDepoimento } from "@/lib/depoimentos-store";
import { DepoimentoSchema, type Gate } from "../_shared";

/** Guard inline (o literal `super_admin` fica visível à matriz de authz). */
async function requireSuperAdmin(): Promise<Gate> {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.id) return { ok: false, res: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  if (user.role !== "super_admin") {
    return { ok: false, res: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) };
  }
  return { ok: true, userId: user.id };
}

/** Edita um depoimento (inclui publicar/despublicar/arquivar via `status`). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return gate.res;
    const { id } = await params;

    const parsed = await parseJson(request, DepoimentoSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }
    const dep = await updateDepoimento(id, parsed.data, gate.userId);
    if (!dep) return NextResponse.json({ error: "Depoimento não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("super-admin/depoimentos PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar depoimento" }, { status: 500 });
  }
}

/** Exclui um depoimento permanentemente. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireSuperAdmin();
    if (!gate.ok) return gate.res;
    const { id } = await params;

    const dep = await deleteDepoimento(id, gate.userId);
    if (!dep) return NextResponse.json({ error: "Depoimento não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("super-admin/depoimentos DELETE", err);
    return NextResponse.json({ error: "Falha ao excluir depoimento" }, { status: 500 });
  }
}
