import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateGrupoFormacaoSchema, parseBody } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import type { GrupoFormacao } from "@/types";

import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";


import { toGrupoFormacao } from "@/lib/converters";
import type { PrismaGrupoFormacao } from "@/lib/converters";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const where = { organizacaoId: user.organizacaoId };
    const orderBy = { nome: "asc" as const };

    if (!pagination) {
      const rows = await prisma.grupoFormacao.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toGrupoFormacao));
    }

    const [rows, total] = await Promise.all([
      prisma.grupoFormacao.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.grupoFormacao.count({ where }),
    ]);
    return NextResponse.json(rows.map(toGrupoFormacao), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("moradas GET", err);
    return NextResponse.json({ error: "Falha ao carregar moradas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsed = parseBody(CreateGrupoFormacaoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;



    if (body.formadorId) {
      const formador = await prisma.usuario.findFirst({
        where: { id: body.formadorId, organizacaoId: user.organizacaoId },
      });
      if (!formador) return NextResponse.json({ error: "Formador não encontrado" }, { status: 400 });
    }

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.grupoFormacao.create({
        data: {
          organizacaoId: user.organizacaoId!,
          nome: body.nome,
          localReuniao: body.localReuniao ?? null,
          tipo: body.tipo ?? "estruturado",
          nivelFormativo: body.nivelFormativo ?? null,
          formadorId: body.formadorId ?? null,
          planoId: body.planoId ?? null,
          gradeId: body.gradeId ?? null,
          vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : null,
          vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : null,
          ativo: body.ativo ?? true,
        },
      });
      if (body.formadorId) {
        await tx.usuario.update({ where: { id: body.formadorId }, data: { grupoFormacaoId: created.id } });
      }
      return created;
    });
    logAction("morada_created", user.id, getClientIp(request), { nome: body.nome }, user.organizacaoId);
    return NextResponse.json(toGrupoFormacao(row), { status: 201 });
  } catch (err) {
    logError("moradas POST", err);
    return NextResponse.json({ error: "Falha ao criar morada" }, { status: 500 });
  }
}
