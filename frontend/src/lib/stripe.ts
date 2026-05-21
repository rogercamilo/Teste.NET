import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY não configurada — Stripe desabilitado.");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" })
  : null;

// Price IDs configured in Stripe Dashboard (set in env vars)
export const STRIPE_PRICES = {
  ESSENCIAL: process.env.STRIPE_PRICE_ESSENCIAL ?? "",
  PROFISSIONAL: process.env.STRIPE_PRICE_PROFISSIONAL ?? "",
} as const;

export function isStripeEnabled(): boolean {
  return stripe !== null;
}
