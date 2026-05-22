import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SU = { role?: string };

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const orgs = await prisma.organizacao.findMany({
      orderBy: { criadoEm: "desc" },
      select: {
        id: true,
        nome: true,
        planoAssinatura: true,
        status: true,
        trialExpiresAt: true,
        criadoEm: true,
        _count: {
          select: { moradas: true, formandos: true, usuarios: true },
        },
      },
    });
    return NextResponse.json(orgs);
  } catch (err) {
    console.error("[super-admin organizacoes GET]", err);
    return NextResponse.json({ error: "Falha ao carregar organizações" }, { status: 500 });
  }
}
