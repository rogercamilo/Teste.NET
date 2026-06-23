import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";
import { suppressEmail } from "@/lib/email-suppression";

export const dynamic = "force-dynamic";

/** Formato (parcial) dos eventos de e-mail enviados pelo Resend. */
interface ResendEvent {
  type: string;
  data: {
    email_id?: string;
    to?: string[];
    bounce?: {
      type?: string; // "Permanent" (hard) | "Transient" (soft) | "Undetermined"
      subType?: string;
      message?: string;
    };
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 503 });
  }

  // Resend assina via Svix — verificação exige o corpo cru e os headers svix-*.
  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };
  if (!headers["svix-id"] || !headers["svix-signature"]) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });
  }

  let event: ResendEvent;
  try {
    event = new Webhook(secret).verify(payload, headers) as ResendEvent;
  } catch (err) {
    logError("resend webhook signature", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  // Idempotência: o svix-id identifica unicamente a mensagem. Prefixo evita
  // colisão com IDs de eventos do Stripe na mesma tabela.
  const eventId = `resend:${headers["svix-id"]}`;
  try {
    await prisma.processedWebhookEvent.create({ data: { id: eventId } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ received: true });
    }
    throw e;
  }

  try {
    await handleEvent(event);
  } catch (err) {
    logError("resend webhook handleEvent", err, { eventType: event.type });
    // Libera a idempotência para que o Resend possa reenviar o evento.
    await prisma.processedWebhookEvent.delete({ where: { id: eventId } }).catch(() => {});
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: ResendEvent): Promise<void> {
  const recipients = event.data.to ?? [];
  if (recipients.length === 0) return;

  switch (event.type) {
    case "email.bounced": {
      // Só hard bounces (Permanent) entram na supressão; soft bounces
      // (Transient/Undetermined) são transitórios e não devem bloquear o envio.
      if (event.data.bounce?.type !== "Permanent") return;
      for (const email of recipients) {
        await suppressEmail({
          email,
          motivo: "BOUNCE",
          detalhe: event.data.bounce?.message,
          emailId: event.data.email_id,
        });
      }
      break;
    }

    case "email.complained": {
      for (const email of recipients) {
        await suppressEmail({
          email,
          motivo: "COMPLAINT",
          emailId: event.data.email_id,
        });
      }
      break;
    }

    // Demais eventos (sent, delivered, opened, clicked, …) são ignorados.
  }
}
