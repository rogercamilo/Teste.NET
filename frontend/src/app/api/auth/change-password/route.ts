import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findById, verifyPassword, updateUser } from "@/lib/users-store";
import { passwordErrorMessage } from "@/lib/password-validation";
import { logAction, getClientIp } from "@/lib/audit-log";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
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

  const userId = (session.user as { id: string }).id;
  const organizacaoId = (session.user as { organizacaoId?: string }).organizacaoId;
  const user = await findById(userId, organizacaoId);
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  if (!user.primeiroAcesso && user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Senha atual é obrigatória" }, { status: 400 });
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }
  }

  await updateUser(userId, { password: newPassword, primeiroAcesso: false });
  logAction("password_changed", userId, getClientIp(request), {}, organizacaoId);
  return NextResponse.json({ ok: true });
}
