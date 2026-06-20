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
  tipoOrganizacao: true,
  status: true,
  trialExpiresAt: true,
  cortesia: true,
  cortesiaExpiresAt: true,
  cortesiaMotivo: true,
  onboardingConcluido: true,
  criadoEm: true,
  _count: { select: { gruposFormacao: true, formandos: true, usuarios: true } },
} as const;

async function attachActivity<T extends { id: string }>(orgs: T[]) {
  if (orgs.length === 0) {
    return orgs as (T & { lastActivityAt: string | null; engajamento7d: number; storageBytes: number })[];
  }

  const ids = orgs.map((o) => o.id);
  const [activityRows, engajamentoRows, storageRows] = await Promise.all([
    prisma.$queryRaw<{ organizacaoId: string; lastActivityAt: Date }[]>`
      SELECT "organizacaoId", MAX("criadoEm") AS "lastActivityAt"
      FROM "AuditLog"
      WHERE "organizacaoId" = ANY(${ids}::text[])
      GROUP BY "organizacaoId"
    `,
    prisma.$queryRaw<{ organizacaoId: string; count: bigint }[]>`
      SELECT "organizacaoId", COUNT(*) as count
      FROM "AuditLog"
      WHERE "organizacaoId" = ANY(${ids}::text[])
        AND "criadoEm" >= NOW() - INTERVAL '7 days'
      GROUP BY "organizacaoId"
    `,
    prisma.$queryRaw<{ organizacaoId: string; bytes: bigint }[]>`
      SELECT "organizacaoId", COALESCE(SUM("tamanho"), 0) AS bytes
      FROM "Arquivo"
      WHERE "organizacaoId" = ANY(${ids}::text[])
      GROUP BY "organizacaoId"
    `,
  ]);

  const actMap = new Map(activityRows.map((r) => [r.organizacaoId, r.lastActivityAt.toISOString()]));
  const engMap = new Map(engajamentoRows.map((r) => [r.organizacaoId, Number(r.count)]));
  const stgMap = new Map(storageRows.map((r) => [r.organizacaoId, Number(r.bytes)]));

  return orgs.map((o) => ({
    ...o,
    lastActivityAt: actMap.get(o.id) ?? null,
    engajamento7d: engMap.get(o.id) ?? 0,
    storageBytes: stgMap.get(o.id) ?? 0,
  }));
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
      return NextResponse.json(await attachActivity(orgs));
    }

    const [orgs, total] = await Promise.all([
      prisma.organizacao.findMany({ orderBy, select: ORG_SELECT, skip: pagination.skip, take: pagination.take }),
      prisma.organizacao.count(),
    ]);
    return NextResponse.json(await attachActivity(orgs), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("super-admin/organizacoes", err);
    return NextResponse.json({ error: "Falha ao carregar organizações" }, { status: 500 });
  }
}
