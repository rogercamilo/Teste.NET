import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findById, verifyPassword, updateUser } from "@/lib/users-store";
import { verifyTotpToken } from "@/lib/totp";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const organizacaoId = (session.user as { organizacaoId?: string }).organizacaoId;
  if (!organizacaoId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  const rl = await limiters.mfa(userId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  const user = await findById(userId, organizacaoId);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (!user.mfaEnabled) {
    return NextResponse.json({ error: "MFA não está ativo nesta conta" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({})) as { totp?: string; currentPassword?: string };

  if (!body.currentPassword || !user.passwordHash) {
    return NextResponse.json({ error: "Senha atual é obrigatória" }, { status: 400 });
  }
  if (!await verifyPassword(body.currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
  }

  if (!body.totp || typeof body.totp !== "string") {
    return NextResponse.json({ error: "Código TOTP é obrigatório" }, { status: 400 });
  }
  if (!user.mfaSecret || !await verifyTotpToken(body.totp, user.mfaSecret)) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  await updateUser(userId, { mfaEnabled: false, mfaSecret: undefined, organizacaoId });
  logAction("mfa_disabled", userId, getClientIp(request), {}, organizacaoId);

  return NextResponse.json({ ok: true });
}
