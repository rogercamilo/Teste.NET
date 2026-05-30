import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { limiters } from "@/lib/rate-limit";
import type { PresencaFormacao } from "@/types";

import { SessionUser as SU } from "@/lib/auth-helpers";

import { toPresenca } from "@/lib/converters";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const agendamentoId = searchParams.get("agendamentoId");
    const formandoId = searchParams.get("formandoId");
    const where: Record<string, unknown> = { organizacaoId: user.organizacaoId };
    if (agendamentoId) where.agendamentoId = agendamentoId;
    if (formandoId) where.formandoId = formandoId;
    const pagination = parsePagination(searchParams);
    const orderBy = { data: "desc" as const };

    if (!pagination) {
      const rows = await prisma.presencaFormacao.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toPresenca));
    }

    const [rows, total] = await Promise.all([
      prisma.presencaFormacao.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.presencaFormacao.count({ where }),
    ]);
    return NextResponse.json(rows.map(toPresenca), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("presencas", err);
    return NextResponse.json({ error: "Falha ao carregar presenças" }, { status: 500 });
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
    const body = await request.json() as Partial<PresencaFormacao>;
    if (!body.agendamentoId || !body.formandoId) {
      return NextResponse.json({ error: "agendamentoId e formandoId são obrigatórios" }, { status: 400 });
    }

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: body.agendamentoId, organizacaoId: user.organizacaoId },
    });
    if (!agendamento) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

    const moradaFilter = user.role === "formador_comunitario" ? { moradaId: user.moradaId ?? null } : {};
    const formando = await prisma.formando.findFirst({
      where: { id: body.formandoId, organizacaoId: user.organizacaoId, ...moradaFilter },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const row = await prisma.presencaFormacao.upsert({
      where: { agendamentoId_formandoId: { agendamentoId: body.agendamentoId, formandoId: body.formandoId } },
      create: {
        organizacaoId: user.organizacaoId,
        agendamentoId: body.agendamentoId,
        formacaoTema: body.formacaoTema ?? agendamento.formacaoTema,
        data: new Date(body.data ?? agendamento.dataInicio),
        formandoId: body.formandoId,
        formandoNome: formando.nome,
        nivelFormativo: formando.nivelFormativo,
        presente: body.presente ?? false,
        justificativa: body.justificativa || null,
      },
      update: {
        presente: body.presente ?? false,
        justificativa: body.justificativa || null,
      },
    });
    logAction("presenca_registrada", user.id, getClientIp(request), { agendamentoId: body.agendamentoId, formandoId: body.formandoId }, user.organizacaoId);
    return NextResponse.json(toPresenca(row), { status: 201 });
  } catch (err) {
    logError("presencas", err);
    return NextResponse.json({ error: "Falha ao registrar presença" }, { status: 500 });
  }
}
