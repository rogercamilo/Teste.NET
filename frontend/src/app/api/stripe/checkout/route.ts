import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_PRICES, isStripeEnabled, type StripePaidPlan, type StripePeriodicidade } from "@/lib/stripe";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { SessionUser as SU } from "@/lib/auth-helpers";

const VALID_PLANS: StripePaidPlan[] = ["BASICO", "INTERMEDIARIO", "AVANCADO"];
const VALID_PERIODICIDADES: StripePeriodicidade[] = ["mensal", "anual"];

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

  let parsed: { plano?: string; periodicidade?: string; context?: string };
  try {
    parsed = await req.json() as { plano?: string; periodicidade?: string; context?: string };
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }
  const { plano, periodicidade = "mensal", context } = parsed;
  if (!plano || !VALID_PLANS.includes(plano as StripePaidPlan)) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }
  if (!VALID_PERIODICIDADES.includes(periodicidade as StripePeriodicidade)) {
    return NextResponse.json({ error: "Periodicidade inválida" }, { status: 400 });
  }

  const priceKey = periodicidade === "anual" ? (`${plano}_ANUAL` as keyof typeof STRIPE_PRICES) : (plano as StripePaidPlan);
  const priceId = STRIPE_PRICES[priceKey];
  if (!priceId) {
    return NextResponse.json({ error: `Preço para ${plano} (${periodicidade}) não configurado` }, { status: 503 });
  }

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { id: true, nome: true, stripeCustomerId: true, status: true, trialExpiresAt: true },
  });
  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  try {
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe!.customers.create({
        name: org.nome,
        email: user.email,
        metadata: { organizacaoId: org.id },
      });
      customerId = customer.id;
      await prisma.organizacao.update({
        where: { id: org.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Trial só é honrado quando vem de Configurações — no onboarding o usuário está optando por pagar agora
    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const trialEnd =
      context !== "onboarding" &&
      org.status === "TRIAL" && org.trialExpiresAt && org.trialExpiresAt > twoDaysFromNow
        ? Math.floor(org.trialExpiresAt.getTime() / 1000)
        : undefined;

    const checkoutSession = await stripe!.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { organizacaoId: org.id, plano },
      subscription_data: {
        metadata: { organizacaoId: org.id },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      success_url: context === "onboarding"
        ? `${appUrl}/onboarding?checkout=success`
        : `${appUrl}/configuracoes?tab=plano&checkout=success`,
      cancel_url: context === "onboarding"
        ? `${appUrl}/onboarding?checkout=cancelled`
        : `${appUrl}/configuracoes?tab=plano&checkout=cancelled`,
    });

    logAction(
      "stripe_checkout_iniciado",
      user.id ?? "unknown",
      getClientIp(req),
      { plano, periodicidade, checkoutSessionId: checkoutSession.id },
      user.organizacaoId
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    logError("stripe/checkout", err);
    return NextResponse.json({ error: "Erro ao criar sessão de pagamento" }, { status: 502 });
  }
}
