import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateUser } from "@/lib/users-store";
import { passwordErrorMessage } from "@/lib/password-validation";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rl = await limiters.passwordChange(getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
      { status: 429 }
    );
  }

  try {
    const { token, novaSenha } = (await request.json()) as {
      token?: string;
      novaSenha?: string;
    };

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const pwdError = !novaSenha ? "A nova senha é obrigatória" : passwordErrorMessage(novaSenha);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { usuario: { select: { id: true, organizacaoId: true, email: true, ativo: true, deletedAt: true } } },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date() ||
      !resetToken.usuario.ativo ||
      resetToken.usuario.deletedAt
    ) {
      return NextResponse.json(
        { error: "Link inválido ou expirado. Solicite um novo link de recuperação." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await updateUser(resetToken.userId, {
      password: novaSenha,
      primeiroAcesso: false,
      organizacaoId: resetToken.usuario.organizacaoId,
    });

    logAction(
      "password_reset_confirmed",
      resetToken.userId,
      getClientIp(request),
      { email: resetToken.usuario.email },
      resetToken.usuario.organizacaoId
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("auth/recuperar-senha/confirmar POST", err);
    return NextResponse.json({ error: "Falha ao redefinir senha" }, { status: 500 });
  }
}
