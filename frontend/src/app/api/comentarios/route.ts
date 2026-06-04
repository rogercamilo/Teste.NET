import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { limiters } from "@/lib/rate-limit";
import type { ComentarioFormando } from "@/types";

import { SessionUser as SU } from "@/lib/auth-helpers";

import { toComentario } from "@/lib/converters";
import { parseBody, CreateComentarioSchema } from "@/lib/schemas";

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
    const parsedBody = parseBody(CreateComentarioSchema, await request.json());
    if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    const { formandoId, texto, tipo, formadorNome } = parsedBody.data;

    const grupoFormacaoFilter = user.role === "formador_comunitario" ? { grupoFormacaoId: user.grupoFormacaoId ?? null } : {};
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId: user.organizacaoId, ...grupoFormacaoFilter },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const row = await prisma.comentarioFormando.create({
      data: {
        organizacaoId: user.organizacaoId,
        formandoId,
        formandoNome: formando.nome,
        formadorId: user.id!,
        formadorNome: formadorNome || null,
        texto,
        tipo: tipo ?? "observacao",
      },
    });
    logAction("comentario_created", user.id, getClientIp(request), { formandoId }, user.organizacaoId);
    return NextResponse.json(toComentario(row), { status: 201 });
  } catch (err) {
    logError("comentarios", err);
    return NextResponse.json({ error: "Falha ao criar comentário" }, { status: 500 });
  }
}
