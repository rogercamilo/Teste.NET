import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { PushSendSchema, parseJson } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import { sendPushToOrg, sendPushToGroup } from "@/lib/push";
import { isGestao } from "@/lib/auth-helpers";
import type { SessionUser as SU } from "@/lib/auth-helpers";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.id || !user?.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const isFC = user.role === "formador_comunitario";
  if (!isGestao(user.role) && !isFC) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, PushSendSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { titulo, corpo, url, grupoFormacaoId } = parsed.data;

    if (isFC) {
      // Formador comunitário só pode enviar para o próprio grupo
      if (!grupoFormacaoId) {
        return NextResponse.json(
          { error: "Formador comunitário deve especificar o grupo de formação." },
          { status: 403 }
        );
      }
      if (grupoFormacaoId !== user.grupoFormacaoId) {
        return NextResponse.json(
          { error: "Sem permissão para enviar para este grupo." },
          { status: 403 }
        );
      }
    }

    const result = grupoFormacaoId
      ? await sendPushToGroup(user.organizacaoId, grupoFormacaoId, { titulo, corpo, url })
      : await sendPushToOrg(user.organizacaoId, { titulo, corpo, url });

    logAction(
      "push_notification_sent",
      user.id,
      getClientIp(request),
      { titulo, sent: result.sent, removed: result.removed, grupoFormacaoId: grupoFormacaoId ?? "all" },
      user.organizacaoId
    );

    return NextResponse.json(result);
  } catch (err) {
    logError("push/send POST", err);
    return NextResponse.json({ error: "Falha ao enviar notificação." }, { status: 500 });
  }
}
