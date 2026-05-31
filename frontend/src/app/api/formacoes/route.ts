import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateFormacaoSchema, parseBody } from "@/lib/schemas";
import type { Formacao } from "@/types";

import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";

import { toFormacao } from "@/lib/converters";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const where = { deletedAt: null, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] };
    const orderBy = { criadoEm: "desc" as const };

    if (!pagination) {
      const rows = await prisma.formacao.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toFormacao));
    }

    const [rows, total] = await Promise.all([
      prisma.formacao.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.formacao.count({ where }),
    ]);
    return NextResponse.json(rows.map(toFormacao), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("formacoes", err);
    return NextResponse.json({ error: "Falha ao carregar formações" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  try {
    const parsed = parseBody(CreateFormacaoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const row = await prisma.formacao.create({
      data: {
        organizacaoId: user.organizacaoId,
        tema: body.tema.trim(),
        objetivo: body.objetivo ?? "",
        descricao: body.descricao ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: body.tipoFormacao ?? "comunitaria",
        eixoId: body.eixoId || null,
        eixoNome: body.eixoNome || null,
        etapaId: body.etapaId || null,
        etapaNome: body.etapaNome || null,
        formadorId: user.id ?? null,
        formadorNome: body.formadorNome ?? "",
        cargaHoraria: body.cargaHoraria ?? 1,
        modalidade: body.modalidade ?? "presencial",
        materialApoio: body.materialApoio || null,
        documentoAnexo: body.documentoAnexo || null,
        documentoAnexoId: body.documentoAnexoId || null,
        gradeId: body.gradeId || null,
        gradeNome: body.gradeNome || null,
        numero: body.numero ?? null,
        observacoesFormador: body.observacoesFormador || null,
        vezesUtilizada: body.vezesUtilizada ?? 0,
      },
    });
    logAction("formacao_created", user.id, getClientIp(request), { tema: body.tema }, user.organizacaoId);
    return NextResponse.json(toFormacao(row), { status: 201 });
  } catch (err) {
    logError("formacoes", err);
    return NextResponse.json({ error: "Falha ao criar formação" }, { status: 500 });
  }
}
