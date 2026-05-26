import { NextResponse } from "next/server";
import { logError } from "@/lib/audit-log";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeEnabled } from "@/lib/stripe";

type SU = { organizacaoId?: string };

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: {
      planoAssinatura: true, status: true,
      stripeCustomerId: true, stripeSubscriptionId: true,
      trialExpiresAt: true,
    },
  });

  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  // Base info always returned
  const base = {
    plano: org.planoAssinatura,
    status: org.status,
    stripeEnabled: isStripeEnabled(),
    hasSubscription: !!org.stripeSubscriptionId,
    trialExpiresAt: org.trialExpiresAt?.toISOString() ?? null,
    // Subscription details — only available when Stripe is configured
    renewsAt: null as string | null,
    cancelAtPeriodEnd: false,
    currentPeriodStart: null as string | null,
    amountCents: null as number | null,
    currency: null as string | null,
    invoices: [] as { id: string; date: string; amountCents: number; currency: string; status: string; url: string | null }[],
  };

  // Enrich with live Stripe data when available
  if (stripe && org.stripeSubscriptionId) {
    try {
      const [subscription, invoiceList] = await Promise.all([
        stripe.subscriptions.retrieve(org.stripeSubscriptionId),
        stripe.invoices.list({ subscription: org.stripeSubscriptionId, limit: 5 }),
      ]);

      // Stripe SDK types vary by API version — cast to access period fields
      const sub = subscription as unknown as {
        current_period_end: number;
        current_period_start: number;
        cancel_at_period_end: boolean;
        items: { data: Array<{ price: { unit_amount: number | null; currency: string } }> };
      };
      base.renewsAt = new Date(sub.current_period_end * 1000).toISOString();
      base.currentPeriodStart = new Date(sub.current_period_start * 1000).toISOString();
      base.cancelAtPeriodEnd = sub.cancel_at_period_end;

      const item = sub.items.data[0];
      if (item?.price) {
        base.amountCents = item.price.unit_amount;
        base.currency = item.price.currency;
      }

      base.invoices = invoiceList.data.map((inv) => ({
        id: inv.id,
        date: new Date((inv.created) * 1000).toISOString(),
        amountCents: inv.amount_paid,
        currency: inv.currency,
        status: inv.status ?? "unknown",
        url: inv.hosted_invoice_url ?? null,
      }));
    } catch (err) {
      logError("", err);
      // Return partial data — don't fail the whole request
    }
  }

  return NextResponse.json(base);
}
