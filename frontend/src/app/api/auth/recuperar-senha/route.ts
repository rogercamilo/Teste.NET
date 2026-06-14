import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

export async function POST(request: Request) {
  const rl = await limiters.email(getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde antes de tentar novamente." },
      { status: 429 }
    );
  }

  try {
    const { email } = (await request.json()) as { email?: string };
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    // Busca em todas as organizações (o e-mail pode estar em mais de uma)
    const usuario = await prisma.usuario.findFirst({
      where: { email: email.trim().toLowerCase(), ativo: true, deletedAt: null },
      include: { organizacao: { select: { id: true, nome: true } } },
    });

    // Resposta idêntica independente de o e-mail existir ou não (evita user enumeration)
    if (!usuario) {
      return NextResponse.json({ ok: true });
    }

    // Invalida tokens anteriores não usados
    await prisma.passwordResetToken.updateMany({
      where: { userId: usuario.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: usuario.id,
        token,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/recuperar-senha/${token}`;

    try {
      await sendPasswordResetEmail({
        organizacaoId: usuario.organizacaoId,
        nome: usuario.nome,
        email: usuario.email,
        resetUrl,
      });
    } catch (emailErr) {
      logError("auth/recuperar-senha/email", emailErr);
    }

    logAction("password_reset_requested", usuario.id, getClientIp(request), { email: usuario.email }, usuario.organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("auth/recuperar-senha POST", err);
    return NextResponse.json({ error: "Falha ao processar solicitação" }, { status: 500 });
  }
}
