import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_PRICES, isStripeEnabled } from "@/lib/stripe";
import { logAction, getClientIp } from "@/lib/audit-log";

type SU = { id?: string; role?: string; organizacaoId?: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "administrador") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });
  }

  const { plano } = await req.json();
  if (!plano || !["ESSENCIAL", "PROFISSIONAL"].includes(plano)) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  const priceId = STRIPE_PRICES[plano as keyof typeof STRIPE_PRICES];
  if (!priceId) {
    return NextResponse.json({ error: `STRIPE_PRICE_${plano} não configurado` }, { status: 503 });
  }

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { id: true, nome: true, stripeCustomerId: true },
  });
  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe!.customers.create({
      name: org.nome,
      metadata: { organizacaoId: org.id },
    });
    customerId = customer.id;
    await prisma.organizacao.update({
      where: { id: org.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkoutSession = await stripe!.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { organizacaoId: org.id, plano },
    success_url: `${appUrl}/configuracoes?checkout=success`,
    cancel_url: `${appUrl}/configuracoes?checkout=cancelled`,
  });

  logAction(
    "stripe_checkout_iniciado",
    user.id,
    getClientIp(req),
    { plano, checkoutSessionId: checkoutSession.id },
    user.organizacaoId
  );

  return NextResponse.json({ url: checkoutSession.url });
}
