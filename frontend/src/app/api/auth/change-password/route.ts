import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findById, verifyPassword, updateUser } from "@/lib/users-store";

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

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json(
      { error: "Nova senha deve ter ao menos 6 caracteres" },
      { status: 400 }
    );
  }

  const userId = (session.user as { id: string }).id;
  const user = findById(userId);
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  // Usuários que NÃO estão em primeiro acesso precisam confirmar a senha atual
  if (!user.primeiroAcesso && user.passwordHash) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Senha atual é obrigatória" }, { status: 400 });
    }
    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }
  }

  updateUser(userId, { password: newPassword, primeiroAcesso: false });
  return NextResponse.json({ ok: true });
}
