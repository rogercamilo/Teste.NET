import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { logAction, logError } from "@/lib/audit-log";

export const dynamic = "force-dynamic";

async function getRawBody(req: NextRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logError("stripe webhook signature", err);
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    logError("stripe webhook handleEvent", err, { eventType: event.type });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizacaoId = session.metadata?.organizacaoId;
      const plano = session.metadata?.plano;

      if (!organizacaoId || !plano) break;

      await prisma.organizacao.update({
        where: { id: organizacaoId },
        data: {
          planoAssinatura: plano as "ESSENCIAL" | "PROFISSIONAL",
          status: "ATIVO",
          stripeSubscriptionId: session.subscription as string,
        },
      });
      logAction("stripe_checkout_concluido", "system", undefined, { plano }, organizacaoId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const org = await prisma.organizacao.findFirst({
        where: { stripeCustomerId: sub.customer as string },
        select: { id: true },
      });
      if (!org) break;

      const priceId = sub.items.data[0]?.price.id;
      const ESSENCIAL = process.env.STRIPE_PRICE_ESSENCIAL;
      const PROFISSIONAL = process.env.STRIPE_PRICE_PROFISSIONAL;

      let plano: string | null = null;
      if (priceId === ESSENCIAL) plano = "ESSENCIAL";
      else if (priceId === PROFISSIONAL) plano = "PROFISSIONAL";

      await prisma.organizacao.update({
        where: { id: org.id },
        data: {
          status: sub.status === "active" ? "ATIVO" : "SUSPENSO",
          ...(plano ? { planoAssinatura: plano as "ESSENCIAL" | "PROFISSIONAL" } : {}),
        },
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const org = await prisma.organizacao.findFirst({
        where: { stripeCustomerId: sub.customer as string },
        select: { id: true },
      });
      if (!org) break;

      await prisma.organizacao.update({
        where: { id: org.id },
        data: {
          status: "SUSPENSO",
          planoAssinatura: "GRATUITO",
          stripeSubscriptionId: null,
        },
      });
      logAction("stripe_assinatura_cancelada", "system", undefined, {}, org.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const org = await prisma.organizacao.findFirst({
        where: { stripeCustomerId: invoice.customer as string },
        select: { id: true },
      });
      if (!org) break;
      logAction("stripe_pagamento_falhou", "system", undefined, { invoiceId: invoice.id }, org.id);
      break;
    }
  }
}
