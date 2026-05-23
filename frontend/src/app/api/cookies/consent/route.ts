import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const COOKIE_VERSION = "1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      analiticos?: boolean;
      marketing?: boolean;
      preferencias?: boolean;
      sessionId?: string;
    };

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const organizacaoId = (session?.user as { organizacaoId?: string } | undefined)?.organizacaoId ?? null;
    const sessionId = body.sessionId ?? null;

    const data = {
      necessarios: true,
      analiticos: body.analiticos ?? false,
      marketing: body.marketing ?? false,
      preferencias: body.preferencias ?? false,
      versao: COOKIE_VERSION,
    };

    if (userId) {
      const existing = await prisma.cookieConsent.findFirst({ where: { userId } });
      if (existing) {
        await prisma.cookieConsent.update({ where: { id: existing.id }, data });
      } else {
        await prisma.cookieConsent.create({ data: { ...data, userId, organizacaoId } });
      }
    } else if (sessionId) {
      const existing = await prisma.cookieConsent.findFirst({ where: { sessionId } });
      if (existing) {
        await prisma.cookieConsent.update({ where: { id: existing.id }, data });
      } else {
        await prisma.cookieConsent.create({ data: { ...data, sessionId } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar consentimento" }, { status: 500 });
  }
}
