import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { PushSendSchema, parseBody } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import { sendPushToOrg } from "@/lib/push";
import type { SessionUser as SU } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(user.id!);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsed = parseBody(PushSendSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { titulo, corpo, url } = parsed.data;

    const result = await sendPushToOrg(user.organizacaoId, { titulo, corpo, url });

    logAction(
      "push_notification_sent",
      user.id,
      getClientIp(request),
      { titulo, sent: result.sent, removed: result.removed },
      user.organizacaoId
    );

    return NextResponse.json(result);
  } catch (err) {
    logError("push/send POST", err);
    return NextResponse.json({ error: "Falha ao enviar notificação." }, { status: 500 });
  }
}
