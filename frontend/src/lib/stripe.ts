import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY não configurada — Stripe desabilitado.");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" })
  : null;

// Price IDs configurados no Stripe Dashboard (definidos via env vars)
export const STRIPE_PRICES = {
  BASICO: process.env.STRIPE_PRICE_BASICO ?? "",
  INTERMEDIARIO: process.env.STRIPE_PRICE_INTERMEDIARIO ?? "",
  AVANCADO: process.env.STRIPE_PRICE_AVANCADO ?? "",
} as const;

export type StripePaidPlan = keyof typeof STRIPE_PRICES;

export function isStripeEnabled(): boolean {
  return stripe !== null;
}
