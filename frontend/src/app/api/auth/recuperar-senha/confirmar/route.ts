import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/users-store";
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

    if (!token || typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    if (!novaSenha) {
      return NextResponse.json({ error: "A nova senha é obrigatória" }, { status: 400 });
    }
    const pwdError = passwordErrorMessage(novaSenha);
    if (pwdError) {
      return NextResponse.json({ error: pwdError }, { status: 400 });
    }

    // Token recebido é o valor bruto — computa hash para buscar no banco.
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
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

    // Hash computado fora da transação (operação CPU-intensiva)
    const passwordHash = await hashPassword(novaSenha);

    // Token invalidado + senha alterada atomicamente — se um falhar, o outro reverte
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.usuario.update({
        where: { id: resetToken.userId },
        data: { passwordHash, primeiroAcesso: false, passwordChangedAt: new Date() },
      }),
    ]);

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
