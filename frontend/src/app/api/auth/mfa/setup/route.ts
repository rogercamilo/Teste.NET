import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findById, updateUser } from "@/lib/users-store";
import { generateTotpSecret, generateTotpUri } from "@/lib/totp";
import { limiters } from "@/lib/rate-limit";
import QRCode from "qrcode";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const organizacaoId = (session.user as { organizacaoId?: string }).organizacaoId;
  if (!organizacaoId) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  const rl = await limiters.passwordChange(userId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  const user = await findById(userId, organizacaoId);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (user.mfaEnabled) {
    return NextResponse.json({ error: "MFA já está ativo nesta conta" }, { status: 400 });
  }

  const secret = generateTotpSecret();
  const uri = generateTotpUri(user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(uri);

  // Store secret (not yet enabled — only active after /enable confirms a valid code)
  await updateUser(userId, { mfaSecret: secret, organizacaoId });

  return NextResponse.json({ secret, qrDataUrl });
}
