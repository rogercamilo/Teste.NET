import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { CreateLeituraSchema, parseJson } from "@/lib/schemas";
import { requireTurmaLeituraAccess } from "./access";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireTurmaLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { organizacaoId, turmaId } = guard.access;

  try {
    const leituras = await prisma.leituraVocacional.findMany({
      where: { turmaId, organizacaoId },
      orderBy: { ordem: "asc" },
      include: {
        capitulos: { orderBy: { numero: "asc" }, select: { id: true, numero: true, titulo: true } },
      },
    });
    return NextResponse.json(leituras);
  } catch (err) {
    logError("vocacional leituras GET", err);
    return NextResponse.json({ error: "Falha ao carregar leituras" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireTurmaLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { user, organizacaoId, turmaId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const parsed = await parseJson(request, CreateLeituraSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { titulo, autor, capitulos } = parsed.data;

    // Nova leitura entra ao fim da trilha da turma.
    const ultima = await prisma.leituraVocacional.findFirst({
      where: { turmaId, organizacaoId },
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });

    const leitura = await prisma.leituraVocacional.create({
      data: {
        organizacaoId,
        turmaId,
        titulo,
        autor: autor || null,
        ordem: (ultima?.ordem ?? -1) + 1,
        capitulos: {
          create: capitulos.map((t, i) => ({ numero: i + 1, titulo: t })),
        },
      },
      include: {
        capitulos: { orderBy: { numero: "asc" }, select: { id: true, numero: true, titulo: true } },
      },
    });

    logAction("vocacional_leitura_criada", user.id, getClientIp(request), { turmaId, leituraId: leitura.id, titulo, capitulos: capitulos.length }, organizacaoId);
    return NextResponse.json(leitura, { status: 201 });
  } catch (err) {
    logError("vocacional leituras POST", err);
    return NextResponse.json({ error: "Falha ao cadastrar leitura" }, { status: 500 });
  }
}
