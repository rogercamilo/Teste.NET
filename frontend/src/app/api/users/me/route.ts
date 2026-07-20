import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateUser, toPublic, findById } from "@/lib/users-store";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { SessionUser } from "@/lib/auth-helpers";

/**
 * Perfil self-service do usuário do app: cada usuário autenticado pode atualizar
 * a PRÓPRIA foto pela aba Perfil, sem depender de um admin. Escopo restrito ao
 * `session.user.id` — nunca aceita um id externo — então não abre a rota
 * administrativa (`/api/users/[id]`, que exige admin) para não-admins.
 */
export async function PATCH(request: Request) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;
  if (!actor?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!actor.organizacaoId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  const rl = await limiters.mutation(actor.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;

    // Allowlist: por ora só a foto. null = remover; string = key/data URL.
    const foto: string | null | undefined =
      body.foto === null ? null
      : typeof body.foto === "string" ? body.foto
      : undefined;

    if (foto === undefined) {
      return NextResponse.json({ error: "Nada a atualizar" }, { status: 400 });
    }
    if (typeof foto === "string" && foto.length > 2_000_000) {
      return NextResponse.json({ error: "Imagem inválida" }, { status: 400 });
    }

    const target = await findById(actor.id, actor.organizacaoId);
    if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const updated = await updateUser(actor.id, { foto, organizacaoId: actor.organizacaoId });
    if (!updated) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    logAction("user_updated", actor.id, getClientIp(request), { self: true, campo: "foto" }, actor.organizacaoId);
    return NextResponse.json(toPublic(updated));
  } catch (err) {
    logError("users/me PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar perfil" }, { status: 500 });
  }
}
