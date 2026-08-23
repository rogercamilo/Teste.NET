import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { limiters } from "@/lib/rate-limit";

import { SessionUser as SU } from "@/lib/auth-helpers";

import { toPresenca } from "@/lib/converters";
import { CreatePresencaSchema, parseJson } from "@/lib/schemas";

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
    if (user.role === "formador_comunitario") {
      where.formando = { grupoFormacaoId: user.grupoFormacaoId ?? null };
    }
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

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsedBody = await parseJson(request, CreatePresencaSchema);
    if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    const body = parsedBody.data;

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: body.agendamentoId, organizacaoId: user.organizacaoId, deletedAt: null },
    });
    if (!agendamento) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

    const grupoFormacaoFilter = user.role === "formador_comunitario" ? { grupoFormacaoId: user.grupoFormacaoId ?? null } : {};
    const formando = await prisma.formando.findFirst({
      where: { id: body.formandoId, organizacaoId: user.organizacaoId, deletedAt: null, ...grupoFormacaoFilter },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    // Estado da chamada: usa statusFormador quando enviado; senão deriva do
    // booleano `presente` (compat com chamadas antigas). `presente` é mantido em
    // sincronia com o status, e a justificativa só persiste no estado "justificado".
    const status = body.statusFormador ?? (body.presente ? "presente" : "ausente");
    const presente = status === "presente";
    const justificativa = status === "justificado" ? (body.justificativa || null) : null;

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
        presente,
        statusFormador: status,
        justificativa,
      },
      update: {
        presente,
        statusFormador: status,
        justificativa,
      },
    });
    logAction("presenca_registrada", user.id, getClientIp(request), { agendamentoId: body.agendamentoId, formandoId: body.formandoId }, user.organizacaoId);
    return NextResponse.json(toPresenca(row), { status: 201 });
  } catch (err) {
    logError("presencas", err);
    return NextResponse.json({ error: "Falha ao registrar presença" }, { status: 500 });
  }
}
