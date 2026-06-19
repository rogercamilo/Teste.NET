import { NextResponse } from "next/server";
import { logError } from "@/lib/audit-log";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { SessionUser as SU } from "@/lib/auth-helpers";

const ORG_SELECT = {
  id: true,
  nome: true,
  planoAssinatura: true,
  status: true,
  trialExpiresAt: true,
  cortesia: true,
  cortesiaExpiresAt: true,
  cortesiaMotivo: true,
  onboardingConcluido: true,
  criadoEm: true,
  _count: { select: { gruposFormacao: true, formandos: true, usuarios: true } },
} as const;

async function attachLastActivity<T extends { id: string }>(orgs: T[]) {
  if (orgs.length === 0) return orgs as (T & { lastActivityAt: string | null })[];

  const rows = await prisma.$queryRaw<{ organizacaoId: string; lastActivityAt: Date }[]>`
    SELECT "organizacaoId", MAX("criadoEm") AS "lastActivityAt"
    FROM "AuditLog"
    WHERE "organizacaoId" IS NOT NULL
    GROUP BY "organizacaoId"
  `;

  const map = new Map(rows.map((r) => [r.organizacaoId, r.lastActivityAt.toISOString()]));
  return orgs.map((o) => ({ ...o, lastActivityAt: map.get(o.id) ?? null }));
}

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
      return NextResponse.json(await attachLastActivity(orgs));
    }

    const [orgs, total] = await Promise.all([
      prisma.organizacao.findMany({ orderBy, select: ORG_SELECT, skip: pagination.skip, take: pagination.take }),
      prisma.organizacao.count(),
    ]);
    return NextResponse.json(await attachLastActivity(orgs), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("super-admin/organizacoes", err);
    return NextResponse.json({ error: "Falha ao carregar organizações" }, { status: 500 });
  }
}
