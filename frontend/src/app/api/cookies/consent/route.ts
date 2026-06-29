import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, anonymizeIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

const SESSION_ID_RE = /^[a-zA-Z0-9_-]{8,128}$/;

const COOKIE_VERSION = "1";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await limiters.mutation(ip);
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

  try {
    const body = await req.json().catch(() => ({})) as {
      analiticos?: boolean;
      marketing?: boolean;
      preferencias?: boolean;
      sessionId?: string;
    };

    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const organizacaoId = (session?.user as { organizacaoId?: string } | undefined)?.organizacaoId ?? null;
    const rawSessionId = body.sessionId ?? null;
    const sessionId = rawSessionId && SESSION_ID_RE.test(rawSessionId) ? rawSessionId : null;
    const ip = anonymizeIp(getClientIp(req));

    const preferences = {
      necessarios: true,
      analiticos: body.analiticos ?? false,
      marketing: body.marketing ?? false,
      preferencias: body.preferencias ?? false,
      versao: COOKIE_VERSION,
    };

    if (userId) {
      const existing = await prisma.cookieConsent.findFirst({ where: { userId } });
      if (existing) {
        // Atualiza preferências; mantém o IP do consentimento original
        await prisma.cookieConsent.update({ where: { id: existing.id }, data: preferences });
      } else {
        await prisma.cookieConsent.create({ data: { ...preferences, userId, organizacaoId, ip } });
      }
    } else if (sessionId) {
      const existing = await prisma.cookieConsent.findFirst({ where: { sessionId } });
      if (existing) {
        await prisma.cookieConsent.update({ where: { id: existing.id }, data: preferences });
      } else {
        await prisma.cookieConsent.create({ data: { ...preferences, sessionId, ip } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao salvar consentimento" }, { status: 500 });
  }
}
