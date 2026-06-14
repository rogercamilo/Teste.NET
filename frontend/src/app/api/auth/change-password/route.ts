import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findById, verifyPassword, updateUser } from "@/lib/users-store";
import { passwordErrorMessage } from "@/lib/password-validation";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { SessionUser } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;
  if (!actor?.id) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (!actor.organizacaoId) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  const rl = await limiters.passwordChange(actor.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  const body = await request.json() as {
    currentPassword?: string;
    newPassword?: string;
  };
  const { currentPassword, newPassword } = body;

  const pwdError = !newPassword ? "Nova senha é obrigatória" : passwordErrorMessage(newPassword);
  if (pwdError) {
    return NextResponse.json({ error: pwdError }, { status: 400 });
  }

  try {
    const user = await findById(actor.id, actor.organizacaoId);
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    if (!user.primeiroAcesso && !user.passwordHash) {
      return NextResponse.json({ error: "Estado de conta inválido. Solicite suporte." }, { status: 403 });
    }

    if (!user.primeiroAcesso && user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Senha atual é obrigatória" }, { status: 400 });
      }
      if (!await verifyPassword(currentPassword, user.passwordHash)) {
        return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
      }
    }

    await updateUser(actor.id, { password: newPassword, primeiroAcesso: false, organizacaoId: actor.organizacaoId });
    logAction("password_changed", actor.id, getClientIp(request), {}, actor.organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("auth/change-password POST", err);
    return NextResponse.json({ error: "Falha ao alterar senha" }, { status: 500 });
  }
}
