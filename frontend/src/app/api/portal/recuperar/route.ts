import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createFormandoAccessToken, RESET_TTL_MS } from "@/lib/portal-formando-auth";
import { sendPortalPasswordResetEmail } from "@/lib/email";
import { limiters } from "@/lib/rate-limit";
import { parseJson } from "@/lib/schemas";
import { logAction, logError, getClientIp } from "@/lib/audit-log";

const RecuperarSchema = z.object({ email: z.string().email() });

/**
 * Solicita a redefinição de senha do portal. Sempre responde sucesso
 * (anti-enumeração): não revela se o e-mail existe ou tem conta de portal.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);

  try {
    const parsed = await parseJson(request, RecuperarSchema);
    if (!parsed.ok) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const email = parsed.data.email.trim().toLowerCase();

    const [rlIp, rlEmail] = await Promise.all([
      limiters.portalMagicLinkIp(ip),
      limiters.portalMagicLink(email),
    ]);
    if (!rlIp.allowed || !rlEmail.allowed) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
    }

    // Só formandos com conta de portal (senha definida) e e-mail único recebem o link.
    const rows = await prisma.formando.findMany({
      where: { email: { equals: email, mode: "insensitive" }, deletedAt: null, ativo: true, passwordHash: { not: null } },
      select: { id: true, nome: true, email: true, organizacaoId: true },
      take: 2,
    });

    if (rows.length === 1) {
      const f = rows[0];
      const raw = await createFormandoAccessToken(f.id, "reset", RESET_TTL_MS);
      const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      await sendPortalPasswordResetEmail({
        organizacaoId: f.organizacaoId,
        nome: f.nome,
        email: f.email,
        resetUrl: `${appUrl}/portal/recuperar/${raw}`,
      }).catch((err) => logError("portal/recuperar send", err));
      logAction("portal_reset_solicitado", undefined, ip, { formandoId: f.id }, f.organizacaoId);
    }

    // Resposta idêntica exista ou não a conta.
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal/recuperar POST", err);
    // Ainda assim, resposta genérica para não vazar estado.
    return NextResponse.json({ ok: true });
  }
}
