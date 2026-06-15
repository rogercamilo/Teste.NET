import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeEnabled } from "@/lib/stripe";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { SessionUser } from "@/lib/auth-helpers";
import {
  calcularPrecoMensal,
  calcularPrecoAnualTotal,
  PERSONALIZADO_BASE_USUARIOS,
} from "@/lib/personalizado-pricing";

const MIN_USUARIOS = PERSONALIZADO_BASE_USUARIOS;
const MAX_USUARIOS = 50_000;

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "administrador") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 503 });
  }

  let parsed: { usuarios?: number; periodicidade?: string };
  try {
    parsed = await req.json() as { usuarios?: number; periodicidade?: string };
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }

  const { usuarios, periodicidade = "mensal" } = parsed;

  if (
    typeof usuarios !== "number" ||
    !Number.isInteger(usuarios) ||
    usuarios < MIN_USUARIOS ||
    usuarios > MAX_USUARIOS
  ) {
    return NextResponse.json(
      { error: `Número de usuários deve ser entre ${MIN_USUARIOS} e ${MAX_USUARIOS}` },
      { status: 400 }
    );
  }

  if (periodicidade !== "mensal" && periodicidade !== "anual") {
    return NextResponse.json({ error: "Periodicidade inválida" }, { status: 400 });
  }

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { id: true, nome: true, stripeCustomerId: true, status: true, trialExpiresAt: true },
  });
  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const isAnual = periodicidade === "anual";
  const unitAmountCents = isAnual
    ? calcularPrecoAnualTotal(usuarios) * 100
    : calcularPrecoMensal(usuarios) * 100;

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

    const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const trialEnd =
      org.status === "TRIAL" && org.trialExpiresAt && org.trialExpiresAt > twoDaysFromNow
        ? Math.floor(org.trialExpiresAt.getTime() / 1000)
        : undefined;

    const checkoutSession = await stripe!.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "brl",
            unit_amount: unitAmountCents,
            recurring: { interval: isAnual ? "year" : "month" },
            product_data: {
              name: `Formattio Personalizado — até ${usuarios} usuários`,
              description: isAnual
                ? `Plano anual · ${usuarios} usuários`
                : `Plano mensal · ${usuarios} usuários`,
            },
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      metadata: { organizacaoId: org.id, plano: "PERSONALIZADO" },
      subscription_data: {
        metadata: { organizacaoId: org.id, plano: "PERSONALIZADO", usuarios: String(usuarios) },
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
      success_url: `${appUrl}/configuracoes?tab=plano&checkout=success`,
      cancel_url: `${appUrl}/configuracoes?tab=plano&checkout=cancelled`,
    });

    logAction(
      "stripe_checkout_iniciado",
      user.id ?? "unknown",
      getClientIp(req),
      { plano: "PERSONALIZADO", periodicidade, usuarios, checkoutSessionId: checkoutSession.id },
      user.organizacaoId
    );

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    logError("stripe/checkout/personalizado", err);
    return NextResponse.json({ error: "Erro ao criar sessão de pagamento" }, { status: 502 });
  }
}
