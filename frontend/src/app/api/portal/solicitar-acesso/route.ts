import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { signPortalMagicToken } from "@/lib/portal-auth";
import { sendPortalMagicLinkEmail } from "@/lib/email";
import { logError } from "@/lib/audit-log";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : null;

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
    }

    const rl = await limiters.portalMagicLink(email);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
        { status: 429 }
      );
    }

    const formando = await prisma.formando.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        ativo: true,
        deletedAt: null,
      },
      select: { id: true, nome: true, email: true, organizacaoId: true },
    });

    if (formando) {
      try {
        const token = await signPortalMagicToken({
          formandoId: formando.id,
          organizacaoId: formando.organizacaoId,
        });
        const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
        const magicLinkUrl = `${appUrl}/api/portal/verificar?token=${token}`;

        await sendPortalMagicLinkEmail({
          organizacaoId: formando.organizacaoId,
          nome: formando.nome,
          email: formando.email,
          magicLinkUrl,
        });
      } catch (err) {
        logError("portal/solicitar-acesso send", err, { email });
      }
    }

    // Sempre retorna 200 — não revela se o e-mail está cadastrado
    return NextResponse.json({
      message:
        "Se este e-mail estiver cadastrado, você receberá um link de acesso em breve.",
    });
  } catch (err) {
    logError("portal/solicitar-acesso", err);
    return NextResponse.json(
      { error: "Falha ao processar solicitação" },
      { status: 500 }
    );
  }
}
