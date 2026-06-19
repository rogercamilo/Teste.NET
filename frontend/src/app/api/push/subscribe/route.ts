import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { PushSubscribeSchema, PushUnsubscribeSchema, parseBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";
import type { SessionUser as SU } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`push_sub:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.id || !user?.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const parsed = parseBody(PushSubscribeSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { endpoint, p256dh, auth: authKey } = parsed.data;

    await prisma.pushSubscription.upsert({
      where: { organizacaoId_endpoint: { organizacaoId: user.organizacaoId, endpoint } },
      create: { organizacaoId: user.organizacaoId, usuarioId: user.id, endpoint, p256dh, auth: authKey },
      update: { p256dh, auth: authKey, usuarioId: user.id },
    });

    logAction("push_subscribed", user.id, ip, { endpoint: endpoint.slice(0, 60) }, user.organizacaoId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    logError("push/subscribe POST", err);
    return NextResponse.json({ error: "Falha ao registrar subscription." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`push_sub:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.id || !user?.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const parsed = parseBody(PushUnsubscribeSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { endpoint } = parsed.data;

    await prisma.pushSubscription.deleteMany({
      where: { organizacaoId: user.organizacaoId, endpoint },
    });

    logAction("push_unsubscribed", user.id, ip, { endpoint: endpoint.slice(0, 60) }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logError("push/subscribe DELETE", err);
    return NextResponse.json({ error: "Falha ao remover subscription." }, { status: 500 });
  }
}
