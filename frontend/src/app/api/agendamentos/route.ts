import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateAgendamentoSchema, parseBody } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import type { Agendamento } from "@/types";
import { sendPushToOrg, formatDataBr } from "@/lib/push";

import { SessionUser as SU } from "@/lib/auth-helpers";

import { toAgendamento as toAg } from "@/lib/converters";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const where = { organizacaoId: user.organizacaoId, deletedAt: null as null };
    const orderBy = { dataInicio: "asc" as const };

    if (!pagination) {
      const rows = await prisma.agendamento.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toAg));
    }

    const [rows, total] = await Promise.all([
      prisma.agendamento.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.agendamento.count({ where }),
    ]);
    return NextResponse.json(rows.map(toAg), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("agendamentos GET", err);
    return NextResponse.json({ error: "Falha ao carregar agendamentos" }, { status: 500 });
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
    const parsed = parseBody(CreateAgendamentoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const formacao = await prisma.formacao.findFirst({
      where: { id: body.formacaoId, deletedAt: null, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      select: { id: true },
    });
    if (!formacao) return NextResponse.json({ error: "Formação não encontrada" }, { status: 404 });

    // formadorId is always the authenticated user; formadorNome resolved server-side.
    const formadorId = user.id!;
    const formadorUser = await prisma.usuario.findUnique({
      where: { id: formadorId },
      select: { nome: true },
    });
    const formadorNome = formadorUser?.nome ?? "";

    const row = await prisma.agendamento.create({
      data: {
        organizacaoId: user.organizacaoId,
        formacaoId: body.formacaoId,
        formacaoTema: body.formacaoTema ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: body.tipoFormacao ?? "comunitaria",
        formadorId,
        formadorNome,
        grupoFormacaoId: body.grupoFormacaoId ?? user.grupoFormacaoId ?? null,
        dataInicio: new Date(body.dataInicio),
        dataFim: new Date(body.dataFim ?? body.dataInicio),
        local: body.local ?? null,
        linkOnline: body.linkOnline ?? null,
        status: body.status ?? "agendada",
        participantes: body.participantes ?? 0,
        observacoes: body.observacoes ?? null,
        googleCalendarEventId: body.googleCalendarEventId ?? null,
      },
    });
    logAction("agendamento_created", user.id, getClientIp(request), { formacaoId: body.formacaoId }, user.organizacaoId);

    // Notificação push — fire-and-forget
    sendPushToOrg(user.organizacaoId, {
      titulo: `Nova formação agendada`,
      corpo: `${row.formacaoTema} — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
      url: "/agenda",
    }).catch(() => {});

    return NextResponse.json(toAg(row), { status: 201 });
  } catch (err) {
    logError("agendamentos POST", err);
    return NextResponse.json({ error: "Falha ao criar agendamento" }, { status: 500 });
  }
}
