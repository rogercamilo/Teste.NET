import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPortalSession } from "@/lib/portal-auth";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { rateLimit } from "@/lib/rate-limit";
import { parseJson } from "@/lib/schemas";
import { isAllowedPushEndpoint } from "@/lib/ssrf";

/**
 * Inscrição de Web Push do próprio formando/vocacionado, autenticada pela
 * sessão do portal (cookie `portal_session`) — não pelo link mágico individual.
 * Espelha `/api/push/subscribe-formando`, mas dispensa o token: o formando ativa
 * e reativa direto do portal, o que resolve a perda de push ao trocar de
 * aparelho ou limpar o navegador.
 */

const SubscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

const UnsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ip = getClientIp(request);
  const rl = await rateLimit(`portal_push_sub:${session.formandoId}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, SubscribeSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { endpoint, p256dh, auth } = parsed.data;

    // Anti-SSRF: só endpoints de provedores de push conhecidos.
    if (!isAllowedPushEndpoint(endpoint)) {
      return NextResponse.json({ error: "Endpoint de push não permitido." }, { status: 400 });
    }

    const formando = await prisma.formando.findFirst({
      where: { id: session.formandoId, organizacaoId: session.organizacaoId, deletedAt: null },
      select: { id: true, organizacaoId: true, grupoFormacaoId: true },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

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

    // Ator é um formando (não um Usuario) — usuarioId fica nulo para não violar a
    // FK do AuditLog; a identidade vai em `details.formandoId`.
    logAction("push_subscribed", undefined, ip, { formandoId: formando.id, endpoint: endpoint.slice(0, 60), via: "portal" }, formando.organizacaoId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    logError("portal/push POST", err);
    return NextResponse.json({ error: "Falha ao registrar notificações." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getPortalSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ip = getClientIp(request);
  const rl = await rateLimit(`portal_push_sub:${session.formandoId}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, UnsubscribeSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { endpoint } = parsed.data;

    await prisma.pushSubscription.deleteMany({
      where: { organizacaoId: session.organizacaoId, endpoint },
    });

    logAction("push_unsubscribed", undefined, ip, { formandoId: session.formandoId, endpoint: endpoint.slice(0, 60), via: "portal" }, session.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logError("portal/push DELETE", err);
    return NextResponse.json({ error: "Falha ao remover notificações." }, { status: 500 });
  }
}
