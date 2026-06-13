import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeEnabled } from "@/lib/stripe";
import { logAction, getClientIp } from "@/lib/audit-log";

import { SessionUser as SU } from "@/lib/auth-helpers";

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

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { stripeCustomerId: true },
  });

  if (!org?.stripeCustomerId) {
    return NextResponse.json(
      { error: "Nenhuma assinatura ativa. Faça upgrade primeiro." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const portalSession = await stripe!.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${appUrl}/configuracoes?tab=plano`,
  });

  logAction("stripe_portal_acessado", user.id, getClientIp(req), {}, user.organizacaoId);

  return NextResponse.json({ url: portalSession.url });
}
