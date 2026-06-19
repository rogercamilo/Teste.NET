import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { sendPushInviteEmail } from "@/lib/email";
import { limiters } from "@/lib/rate-limit";
import type { SessionUser as SU } from "@/lib/auth-helpers";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  try {
    const { id } = await params;
    const formando = await prisma.formando.findFirst({
      where: { id, organizacaoId: user.organizacaoId, deletedAt: null },
      select: { id: true, nome: true, email: true, grupoFormacaoId: true, grupoFormacao: { select: { nome: true } } },
    });

    if (!formando) {
      return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
    }

    if (!formando.email) {
      return NextResponse.json({ error: "Este formando não possui e-mail cadastrado." }, { status: 400 });
    }

    const tokenAssinatura = crypto.randomBytes(32).toString("hex");
    await prisma.formando.update({
      where: { id: formando.id },
      data: { tokenAssinatura },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const result = await sendPushInviteEmail({
      organizacaoId: user.organizacaoId,
      nome: formando.nome,
      email: formando.email,
      grupoNome: formando.grupoFormacao?.nome ?? null,
      ativarUrl: `${appUrl}/ativar-notificacoes/${tokenAssinatura}`,
    });

    logAction("push_invite_sent", user.id, getClientIp(request), { formandoId: formando.id }, user.organizacaoId);

    if (!result.sent) {
      return NextResponse.json({ error: result.error ?? "Falha ao enviar e-mail." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("formandos/push-invite POST", err);
    return NextResponse.json({ error: "Falha ao enviar convite." }, { status: 500 });
  }
}
