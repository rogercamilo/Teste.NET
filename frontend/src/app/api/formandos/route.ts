import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { canAddFormando } from "@/lib/plan-limits";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateFormandoSchema, parseBody } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import type { Formando, ProgressoEtapa } from "@/types";

import { SessionUser as SU } from "@/lib/auth-helpers";

import { toFormando } from "@/lib/converters";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const moradaId = searchParams.get("moradaId");
    const where: Record<string, unknown> = { organizacaoId: user.organizacaoId, deletedAt: null };

    if (user.role === "formador_comunitario") {
      where.moradaId = user.moradaId ?? null;
    } else if (moradaId) {
      where.moradaId = moradaId;
    }

    const pagination = parsePagination(searchParams);
    const findManyArgs = {
      where,
      include: { progressoEtapas: true, morada: { select: { gradeId: true } } },
      orderBy: { nome: "asc" as const },
    };

    const [rows, total] = pagination
      ? await Promise.all([
          prisma.formando.findMany({ ...findManyArgs, skip: pagination.skip, take: pagination.take }),
          prisma.formando.count({ where }),
        ])
      : [await prisma.formando.findMany(findManyArgs), null];

    const gradeIds = [...new Set(
      rows.map((r) => r.morada?.gradeId).filter((id): id is string => !!id)
    )];
    const gradeMap = new Map<string, number>();
    if (gradeIds.length > 0) {
      const grades = await prisma.gradeFormativa.findMany({
        where: { id: { in: gradeIds } },
        select: { id: true, totalFormacoes: true },
      });
      for (const g of grades) gradeMap.set(g.id, g.totalFormacoes);
    }

    // Only query formacao counts for rows that don't have a grade-based total
    const niveisWithoutGrade = [...new Set(
      rows
        .filter((r) => !r.morada?.gradeId || !gradeMap.has(r.morada.gradeId))
        .map((r) => r.nivelFormativo)
    )];
    const countByNivel = new Map<string, number>();
    if (niveisWithoutGrade.length > 0) {
      const formacoesAgg = await prisma.formacao.groupBy({
        by: ["nivelFormativo"],
        where: {
          nivelFormativo: { in: niveisWithoutGrade },
          OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }],
          deletedAt: null,
        },
        _count: { id: true },
      });
      for (const c of formacoesAgg) countByNivel.set(c.nivelFormativo, c._count.id);
    }

    const data = rows.map((r) => {
      const { morada, ...rest } = r;
      const gradeTotal = morada?.gradeId ? gradeMap.get(morada.gradeId) : undefined;
      const nivelTotal = countByNivel.get(r.nivelFormativo);
      const totalFormacoes = (gradeTotal ?? nivelTotal) || rest.totalFormacoes;
      return toFormando({ ...rest, totalFormacoes });
    });

    if (pagination && total !== null) {
      return NextResponse.json(data, { headers: paginationHeaders(total, pagination) });
    }
    return NextResponse.json(data);
  } catch (err) {
    logError("formandos GET", err);
    return NextResponse.json({ error: "Falha ao carregar formandos" }, { status: 500 });
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
    const parsed = parseBody(CreateFormandoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const limitCheck = await canAddFormando(user.organizacaoId!);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    if (user.role === "formador_comunitario" && body.moradaId && body.moradaId !== user.moradaId) {
      return NextResponse.json({ error: "Sem permissão para criar formandos em outra morada" }, { status: 403 });
    }

    const row = await prisma.formando.create({
      data: {
        organizacaoId: user.organizacaoId,
        nome: body.nome,
        dataNascimento: new Date(body.dataNascimento),
        estadoCivil: body.estadoCivil ?? "solteiro",
        modalidade: body.modalidade ?? "presencial",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        dataIngresso: new Date(body.dataIngresso ?? Date.now()),
        telefone: body.telefone ?? "",
        email: body.email ?? "",
        ativo: body.ativo ?? true,
        motivoInatividade: body.motivoInatividade ?? null,
        foto: body.foto ?? null,
        turmaId: body.turmaId ?? null,
        moradaId: body.moradaId ?? null,
        totalFormacoes: body.totalFormacoes ?? 0,
        formacoesRealizadas: body.formacoesRealizadas ?? 0,
        progressoEtapas: {
          create: (body.progressoEtapas ?? []).map((p) => ({
            nivelFormativo: p.nivel,
            formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas ?? 0,
            retirosComunitariosRealizados: p.retirosComunitariosRealizados ?? 0,
            retirosPessoaisRealizados: p.retirosPessoaisRealizados ?? 0,
            iniciouEm: p.iniciouEm ? new Date(p.iniciouEm) : null,
            concluiuEm: p.concluiuEm ? new Date(p.concluiuEm) : null,
          })),
        },
      },
      include: { progressoEtapas: true },
    });
    logAction("formando_created", user.id, getClientIp(request), { nome: body.nome }, user.organizacaoId);
    return NextResponse.json(toFormando(row), { status: 201 });
  } catch (err) {
    logError("formandos POST", err);
    return NextResponse.json({ error: "Falha ao criar formando" }, { status: 500 });
  }
}
