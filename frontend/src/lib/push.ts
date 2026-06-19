import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";

// Initialized lazily so missing env vars don't crash unrelated routes at import time.
let vapidInitialized = false;

function ensureVapid(): void {
  if (vapidInitialized) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID env vars not configured (VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidInitialized = true;
}

export interface PushPayload {
  titulo: string;
  corpo: string;
  url?: string;
  icon?: string;
  badge?: string;
}

type SendResult = "ok" | "expired" | "error";

interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendToOne(sub: StoredSubscription, payload: PushPayload): Promise<SendResult> {
  const pushSub: WebPushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    return "ok";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return "expired";
    logError("push:sendToOne", err, { endpoint: sub.endpoint.slice(0, 60) });
    return "error";
  }
}

async function dispatchToSubs(
  subs: StoredSubscription[],
  payload: PushPayload
): Promise<{ sent: number; removed: number; failed: number }> {
  const fullPayload: PushPayload = {
    icon: "/push-icon-192.png",
    badge: "/push-badge-96.png",
    ...payload,
  };

  const results = await Promise.allSettled(subs.map((s) => sendToOne(s, fullPayload)));

  const expiredIds: string[] = [];
  let failed = 0;

  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      if (r.value === "expired") expiredIds.push(subs[i].id);
      else if (r.value === "error") failed++;
    }
  });

  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } });
  }

  return {
    sent: subs.length - expiredIds.length - failed,
    removed: expiredIds.length,
    failed,
  };
}

export async function sendPushToOrg(
  organizacaoId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number; failed: number }> {
  ensureVapid();

  const subs = await prisma.pushSubscription.findMany({
    where: { organizacaoId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  return dispatchToSubs(subs, payload);
}

export async function sendPushToGroup(
  organizacaoId: string,
  grupoFormacaoId: string,
  payload: PushPayload
): Promise<{ sent: number; removed: number; failed: number }> {
  ensureVapid();

  const subs = await prisma.pushSubscription.findMany({
    where: { organizacaoId, grupoFormacaoId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  return dispatchToSubs(subs, payload);
}

export async function countSubscriptions(organizacaoId: string): Promise<number> {
  return prisma.pushSubscription.count({ where: { organizacaoId } });
}
