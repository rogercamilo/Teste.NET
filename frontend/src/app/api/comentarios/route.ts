import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { limiters } from "@/lib/rate-limit";
import type { ComentarioFormando } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

type PrismaComentario = {
  id: string; organizacaoId: string; formandoId: string; formandoNome: string;
  formadorId: string; formadorNome: string | null; texto: string;
  tipo: string; criadoEm: Date;
};

function toComentario(c: PrismaComentario): ComentarioFormando {
  return {
    id: c.id,
    formandoId: c.formandoId,
    formandoNome: c.formandoNome,
    formadorId: c.formadorId,
    formadorNome: c.formadorNome ?? undefined,
    texto: c.texto,
    tipo: c.tipo as ComentarioFormando["tipo"],
    criadoEm: c.criadoEm.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const formandoId = searchParams.get("formandoId");
    const where: Record<string, unknown> = { organizacaoId: user.organizacaoId };
    if (formandoId) where.formandoId = formandoId;
    const pagination = parsePagination(searchParams);
    const orderBy = { criadoEm: "desc" as const };

    if (!pagination) {
      const rows = await prisma.comentarioFormando.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toComentario));
    }

    const [rows, total] = await Promise.all([
      prisma.comentarioFormando.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.comentarioFormando.count({ where }),
    ]);
    return NextResponse.json(rows.map(toComentario), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("comentarios", err);
    return NextResponse.json({ error: "Falha ao carregar comentários" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id!);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = await request.json() as Partial<ComentarioFormando>;
    if (!body.formandoId || !body.texto?.trim()) {
      return NextResponse.json({ error: "formandoId e texto são obrigatórios" }, { status: 400 });
    }

    const formando = await prisma.formando.findFirst({
      where: { id: body.formandoId, organizacaoId: user.organizacaoId },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const row = await prisma.comentarioFormando.create({
      data: {
        organizacaoId: user.organizacaoId,
        formandoId: body.formandoId,
        formandoNome: formando.nome,
        formadorId: user.id!,
        formadorNome: body.formadorNome || null,
        texto: body.texto.trim(),
        tipo: ["adesao", "dificuldade", "progresso", "observacao"].includes(body.tipo ?? "") ? (body.tipo ?? "observacao") : "observacao",
      },
    });
    logAction("comentario_created", user.id, getClientIp(request), { formandoId: body.formandoId }, user.organizacaoId);
    return NextResponse.json(toComentario(row), { status: 201 });
  } catch (err) {
    logError("comentarios", err);
    return NextResponse.json({ error: "Falha ao criar comentário" }, { status: 500 });
  }
}
