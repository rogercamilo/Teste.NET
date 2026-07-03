import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Busca global do Command Palette (Cmd-K). Escopo por organização + papel,
 * espelhando exatamente o que cada listagem já expõe:
 *  - Formador Comunitário: formandos/grupos apenas da própria morada.
 *  - Gestão (FG/Admin): toda a organização.
 *  - Planos/Formações incluem globais (isGlobal), como nas telas correspondentes.
 * Super admin (sem organizacaoId) recebe resultados vazios.
 */

const LIMIT = 6;

type Row = { id: string; label: string };

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as
    | { organizacaoId?: string; role?: string; grupoFormacaoId?: string | null }
    | undefined;

  if (!user?.organizacaoId) {
    return NextResponse.json({ results: emptyResults() });
  }

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ results: emptyResults() });
  }

  const organizacaoId = user.organizacaoId;
  const isFC = user.role === "formador_comunitario";
  const grupoId = user.grupoFormacaoId ?? null;
  // FC sem morada não enxerga formandos/grupos.
  const semAcessoMembros = isFC && !grupoId;
  const contains = { contains: q, mode: "insensitive" as const };
  const empty = Promise.resolve<{ id: string; nome: string }[]>([]);

  const [formandos, grupos, planos, grades, formacoes] = await Promise.all([
    semAcessoMembros
      ? empty
      : prisma.formando.findMany({
          where: {
            organizacaoId,
            deletedAt: null,
            nome: contains,
            ...(isFC ? { grupoFormacaoId: grupoId } : {}),
          },
          select: { id: true, nome: true },
          take: LIMIT,
          orderBy: { nome: "asc" },
        }),
    semAcessoMembros
      ? empty
      : prisma.grupoFormacao.findMany({
          where: {
            organizacaoId,
            nome: contains,
            ...(isFC ? { id: grupoId ?? undefined } : {}),
          },
          select: { id: true, nome: true },
          take: LIMIT,
          orderBy: { nome: "asc" },
        }),
    prisma.planoFormativo.findMany({
      where: { OR: [{ organizacaoId }, { isGlobal: true }], nome: contains },
      select: { id: true, nome: true },
      take: LIMIT,
      orderBy: { nome: "asc" },
    }),
    prisma.gradeFormativa.findMany({
      where: { organizacaoId, nome: contains },
      select: { id: true, nome: true },
      take: LIMIT,
      orderBy: { nome: "asc" },
    }),
    prisma.formacao.findMany({
      where: { OR: [{ organizacaoId }, { isGlobal: true }], deletedAt: null, tema: contains },
      select: { id: true, tema: true },
      take: LIMIT,
      orderBy: { tema: "asc" },
    }),
  ]);

  const results = {
    formandos: formandos.map((f): Row => ({ id: f.id, label: f.nome })),
    grupos: grupos.map((g): Row => ({ id: g.id, label: g.nome })),
    planos: planos.map((p): Row => ({ id: p.id, label: p.nome })),
    grades: grades.map((g): Row => ({ id: g.id, label: g.nome })),
    formacoes: formacoes.map((f): Row => ({ id: f.id, label: f.tema })),
  };

  return NextResponse.json({ results });
}

function emptyResults() {
  return { formandos: [], grupos: [], planos: [], grades: [], formacoes: [] };
}
