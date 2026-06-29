import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { parseJson } from "@/lib/schemas";

const SubscribeFormandoSchema = z.object({
  token: z.string().min(1),
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

const UnsubscribeFormandoSchema = z.object({
  token: z.string().min(1),
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`push_formando_sub:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, SubscribeFormandoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { token, endpoint, p256dh, auth } = parsed.data;

    const formando = await prisma.formando.findUnique({
      where: { tokenAssinatura: token },
      select: { id: true, organizacaoId: true, grupoFormacaoId: true, deletedAt: true },
    });

    if (!formando || formando.deletedAt) {
      return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 404 });
    }

    await prisma.pushSubscription.upsert({
      where: { organizacaoId_endpoint: { organizacaoId: formando.organizacaoId, endpoint } },
      create: {
        organizacaoId: formando.organizacaoId,
        formandoId: formando.id,
        grupoFormacaoId: formando.grupoFormacaoId,
        endpoint,
        p256dh,
        auth,
      },
      update: {
        p256dh,
        auth,
        formandoId: formando.id,
        grupoFormacaoId: formando.grupoFormacaoId,
      },
    });

    logAction("push_subscribed", formando.id, ip, { endpoint: endpoint.slice(0, 60), via: "token" }, formando.organizacaoId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    logError("push/subscribe-formando POST", err);
    return NextResponse.json({ error: "Falha ao registrar subscription." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  const rl = await rateLimit(`push_formando_sub:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, UnsubscribeFormandoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { token, endpoint } = parsed.data;

    const formando = await prisma.formando.findUnique({
      where: { tokenAssinatura: token },
      select: { id: true, organizacaoId: true, deletedAt: true },
    });

    if (!formando || formando.deletedAt) {
      return NextResponse.json({ error: "Link inválido." }, { status: 404 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { organizacaoId: formando.organizacaoId, endpoint },
    });

    logAction("push_unsubscribed", formando.id, ip, { endpoint: endpoint.slice(0, 60), via: "token" }, formando.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logError("push/subscribe-formando DELETE", err);
    return NextResponse.json({ error: "Falha ao remover subscription." }, { status: 500 });
  }
}
