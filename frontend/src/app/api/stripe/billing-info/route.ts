import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isStripeEnabled } from "@/lib/stripe";

type SU = { organizacaoId?: string };

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { planoAssinatura: true, status: true, stripeSubscriptionId: true },
  });

  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  return NextResponse.json({
    plano: org.planoAssinatura,
    status: org.status,
    stripeEnabled: isStripeEnabled(),
    hasSubscription: !!org.stripeSubscriptionId,
  });
}
