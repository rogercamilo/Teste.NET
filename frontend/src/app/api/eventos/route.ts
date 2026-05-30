import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { limiters } from "@/lib/rate-limit";
import { CreateEventoSchema, parseBody } from "@/lib/schemas";
import type { EventoFormando } from "@/types";

import { SessionUser as SU } from "@/lib/auth-helpers";

import { toEvento } from "@/lib/converters";

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
      const rows = await prisma.eventoFormando.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toEvento));
    }

    const [rows, total] = await Promise.all([
      prisma.eventoFormando.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.eventoFormando.count({ where }),
    ]);
    return NextResponse.json(rows.map(toEvento), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("eventos", err);
    return NextResponse.json({ error: "Falha ao carregar eventos" }, { status: 500 });
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
    const parsed = parseBody(CreateEventoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const formando = await prisma.formando.findFirst({
      where: { id: body.formandoId, organizacaoId: user.organizacaoId },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const row = await prisma.eventoFormando.create({
      data: {
        organizacaoId: user.organizacaoId,
        formandoId: body.formandoId,
        formadorId: user.id!,
        tipo: body.tipo,
        periodoInicio: body.periodoInicio ? new Date(body.periodoInicio) : null,
        periodoFim: body.periodoFim ? new Date(body.periodoFim) : null,
        notaAdesao: body.notaAdesao || null,
        textoAvaliacao: body.textoAvaliacao || null,
        motivo: body.motivo || null,
        tipoDesligamento: body.tipoDesligamento || null,
        dataEfetiva: body.dataEfetiva ? new Date(body.dataEfetiva) : null,
        checklistDevolveuEstatuto: body.checklistDevolveuEstatuto ?? null,
        checklistDevolveuSacramental: body.checklistDevolveuSacramental ?? null,
        checklistApresentouCarta: body.checklistApresentouCarta ?? null,
        checklistAcompanhadoModerador: body.checklistAcompanhadoModerador ?? null,
        dataInicioLicenca: body.dataInicioLicenca ? new Date(body.dataInicioLicenca) : null,
        dataFimLicenca: body.dataFimLicenca ? new Date(body.dataFimLicenca) : null,
      },
    });
    logAction("evento_created", user.id, getClientIp(request), { formandoId: body.formandoId, tipo: body.tipo }, user.organizacaoId);
    return NextResponse.json(toEvento(row), { status: 201 });
  } catch (err) {
    logError("eventos", err);
    return NextResponse.json({ error: "Falha ao criar evento" }, { status: 500 });
  }
}
