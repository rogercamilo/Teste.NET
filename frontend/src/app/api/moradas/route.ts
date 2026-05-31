import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { canAddMorada } from "@/lib/plan-limits";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateMoradaSchema, parseBody } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import type { Morada } from "@/types";

import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";
type PrismaMorada = {
  id: string; organizacaoId: string; nome: string; localReuniao: string | null;
  nivelFormativo: string; formadorId: string | null; planoId: string | null;
  gradeId: string | null; vigenciaInicio: Date | null; vigenciaFim: Date | null;
  ativo: boolean; criadoEm: Date;
};


import { toMorada } from "@/lib/converters";

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
      const rows = await prisma.morada.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toMorada));
    }

    const [rows, total] = await Promise.all([
      prisma.morada.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.morada.count({ where }),
    ]);
    return NextResponse.json(rows.map(toMorada), { headers: paginationHeaders(total, pagination) });
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
    const parsed = parseBody(CreateMoradaSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const limitCheck = await canAddMorada(user.organizacaoId!);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    if (body.formadorId) {
      const formador = await prisma.usuario.findFirst({
        where: { id: body.formadorId, organizacaoId: user.organizacaoId },
      });
      if (!formador) return NextResponse.json({ error: "Formador não encontrado" }, { status: 400 });
    }

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.morada.create({
        data: {
          organizacaoId: user.organizacaoId!,
          nome: body.nome,
          localReuniao: body.localReuniao ?? null,
          nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
          formadorId: body.formadorId ?? null,
          planoId: body.planoId ?? null,
          gradeId: body.gradeId ?? null,
          vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : null,
          vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : null,
          ativo: body.ativo ?? true,
        },
      });
      if (body.formadorId) {
        await tx.usuario.update({ where: { id: body.formadorId }, data: { moradaId: created.id } });
      }
      return created;
    });
    logAction("morada_created", user.id, getClientIp(request), { nome: body.nome }, user.organizacaoId);
    return NextResponse.json(toMorada(row), { status: 201 });
  } catch (err) {
    logError("moradas POST", err);
    return NextResponse.json({ error: "Falha ao criar morada" }, { status: 500 });
  }
}
