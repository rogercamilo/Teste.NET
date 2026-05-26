import { NextResponse } from "next/server";
import { logError } from "@/lib/audit-log";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginationHeaders } from "@/lib/pagination";

type SU = { role?: string };

const ORG_SELECT = {
  id: true,
  nome: true,
  planoAssinatura: true,
  status: true,
  trialExpiresAt: true,
  cortesia: true,
  cortesiaExpiresAt: true,
  cortesiaMotivo: true,
  criadoEm: true,
  _count: { select: { moradas: true, formandos: true, usuarios: true } },
} as const;

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const orderBy = { criadoEm: "desc" as const };

    if (!pagination) {
      const orgs = await prisma.organizacao.findMany({ orderBy, select: ORG_SELECT });
      return NextResponse.json(orgs);
    }

    const [orgs, total] = await Promise.all([
      prisma.organizacao.findMany({ orderBy, select: ORG_SELECT, skip: pagination.skip, take: pagination.take }),
      prisma.organizacao.count(),
    ]);
    return NextResponse.json(orgs, { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("super-admin/organizacoes", err);
    return NextResponse.json({ error: "Falha ao carregar organizações" }, { status: 500 });
  }
}
