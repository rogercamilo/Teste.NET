import { prisma } from "@/lib/prisma";
import { stripe, isStripeEnabled } from "@/lib/stripe";

export interface Invoice {
  id: string;
  date: string;
  amountCents: number;
  currency: string;
  status: string;
  url: string | null;
}

export interface BillingInfo {
  plano: "GRATUITO" | "BASICO" | "INTERMEDIARIO" | "AVANCADO" | "PERSONALIZADO";
  status: "TRIAL" | "ATIVO" | "SUSPENSO" | "CANCELADO";
  stripeEnabled: boolean;
  hasSubscription: boolean;
  trialExpiresAt: string | null;
  renewsAt: string | null;
  cancelAtPeriodEnd: boolean;
  amountCents: number | null;
  currency: string | null;
  invoices: Invoice[];
}

export async function getBillingInfo(orgId: string): Promise<BillingInfo> {
  const org = await prisma.organizacao.findUnique({
    where: { id: orgId },
    select: {
      planoAssinatura: true,
      status: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      trialExpiresAt: true,
    },
  });

  if (!org) throw new Error("Organização não encontrada");

  const base: BillingInfo = {
    plano: org.planoAssinatura as BillingInfo["plano"],
    status: org.status as BillingInfo["status"],
    stripeEnabled: isStripeEnabled(),
    hasSubscription: !!org.stripeSubscriptionId,
    trialExpiresAt: org.trialExpiresAt?.toISOString() ?? null,
    renewsAt: null,
    cancelAtPeriodEnd: false,
    amountCents: null,
    currency: null,
    invoices: [],
  };

  if (stripe && org.stripeSubscriptionId) {
    try {
      const [subscription, invoiceList] = await Promise.all([
        stripe.subscriptions.retrieve(org.stripeSubscriptionId),
        stripe.invoices.list({ subscription: org.stripeSubscriptionId, limit: 5 }),
      ]);

      const sub = subscription as unknown as {
        current_period_end: number;
        cancel_at_period_end: boolean;
        items: { data: Array<{ price: { unit_amount: number | null; currency: string } }> };
      };

      base.renewsAt = new Date(sub.current_period_end * 1000).toISOString();
      base.cancelAtPeriodEnd = sub.cancel_at_period_end;

      const item = sub.items.data[0];
      if (item?.price) {
        base.amountCents = item.price.unit_amount;
        base.currency = item.price.currency;
      }

      base.invoices = invoiceList.data.map((inv) => ({
        id: inv.id,
        date: new Date(inv.created * 1000).toISOString(),
        amountCents: inv.amount_paid,
        currency: inv.currency,
        status: inv.status ?? "unknown",
        url: inv.hosted_invoice_url ?? null,
      }));
    } catch {
      // Retorna dados parciais se Stripe falhar — não bloqueia a página
    }
  }

  return base;
}
