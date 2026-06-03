import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { PushSubscribeSchema, PushUnsubscribeSchema, parseBody } from "@/lib/schemas";
import { rateLimit } from "@/lib/rate-limit";

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID!;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`push_sub:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  try {
    const parsed = parseBody(PushSubscribeSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { endpoint, p256dh, auth } = parsed.data;

    await prisma.pushSubscription.upsert({
      where: { organizacaoId_endpoint: { organizacaoId: DEFAULT_ORG_ID, endpoint } },
      create: { organizacaoId: DEFAULT_ORG_ID, endpoint, p256dh, auth },
      update: { p256dh, auth },
    });

    logAction("push_subscribed", undefined, ip, { endpoint: endpoint.slice(0, 60) }, DEFAULT_ORG_ID);
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

  try {
    const parsed = parseBody(PushUnsubscribeSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { endpoint } = parsed.data;

    await prisma.pushSubscription.deleteMany({
      where: { organizacaoId: DEFAULT_ORG_ID, endpoint },
    });

    logAction("push_unsubscribed", undefined, ip, { endpoint: endpoint.slice(0, 60) }, DEFAULT_ORG_ID);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logError("push/subscribe DELETE", err);
    return NextResponse.json({ error: "Falha ao remover subscription." }, { status: 500 });
  }
}
