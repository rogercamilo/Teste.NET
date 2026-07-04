import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { sendPortalWelcomeEmail } from "@/lib/email";
import { createFormandoAccessToken, ATIVACAO_TTL_MS } from "@/lib/portal-formando-auth";
import { limiters } from "@/lib/rate-limit";
import type { SessionUser as SU } from "@/lib/auth-helpers";

/**
 * Reenvia ao formando o e-mail de acesso ao Portal (boas-vindas + link de 1º
 * acesso para criar/redefinir a senha). Conveniência de onboarding para a
 * equipe. Substitui o antigo convite de push por token de assinatura.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
      select: { id: true, nome: true, email: true, grupoFormacao: { select: { nome: true } } },
    });

    if (!formando) {
      return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
    }
    if (!formando.email) {
      return NextResponse.json({ error: "Este formando não possui e-mail cadastrado." }, { status: 400 });
    }

    const raw = await createFormandoAccessToken(formando.id, "ativacao", ATIVACAO_TTL_MS);
    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const result = await sendPortalWelcomeEmail({
      organizacaoId: user.organizacaoId,
      nome: formando.nome,
      email: formando.email,
      grupoNome: formando.grupoFormacao?.nome ?? null,
      ativarUrl: `${appUrl}/portal/ativar/${raw}`,
    });

    logAction("portal_acesso_reenviado", user.id, getClientIp(request), { formandoId: formando.id }, user.organizacaoId);

    if (!result.sent) {
      return NextResponse.json({ error: result.error ?? "Falha ao enviar e-mail." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("formandos/reenviar-acesso POST", err);
    return NextResponse.json({ error: "Falha ao reenviar o acesso." }, { status: 500 });
  }
}
