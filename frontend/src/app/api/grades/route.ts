import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { parsePagination, paginationHeaders } from "@/lib/pagination";

import { isGestao, SessionUser as SU } from "@/lib/auth-helpers";

import { toGrade } from "@/lib/converters";
import { CreateGradeSchema, parseJson } from "@/lib/schemas";
import { syncGradeEixos, reconcileGradeFormacoes } from "@/lib/grade-formacoes";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const where = { OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] };
    const orderBy = { criadoEm: "desc" as const };
    const include = { eixos: { include: { etapas: true } } };

    if (!pagination) {
      const rows = await prisma.gradeFormativa.findMany({ where, include, orderBy });
      return NextResponse.json(rows.map(toGrade));
    }

    const [rows, total] = await Promise.all([
      prisma.gradeFormativa.findMany({ where, include, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.gradeFormativa.count({ where }),
    ]);
    return NextResponse.json(rows.map(toGrade), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("grades", err);
    return NextResponse.json({ error: "Falha ao carregar grades" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isGestao(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  try {
    const parsedBody = await parseJson(request, CreateGradeSchema);
    if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    const body = parsedBody.data;

    // O plano é a fonte dos eixos — precisa existir e pertencer ao tenant.
    const plano = await prisma.planoFormativo.findFirst({
      where: { id: body.planoId!, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      select: { id: true },
    });
    if (!plano) return NextResponse.json({ error: "Plano formativo inválido" }, { status: 400 });

    const grade = await prisma.$transaction(async (tx) => {
      const created = await tx.gradeFormativa.create({
        data: {
          organizacaoId: user.organizacaoId,
          nome: body.nome ?? "",
          planoId: plano.id,
          planoNome: body.planoNome ?? "",
          nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
          vigenciaInicio: new Date(body.vigenciaInicio ?? Date.now()),
          vigenciaFim: new Date(body.vigenciaFim ?? Date.now()),
          versao: body.versao ?? "1.0",
          totalFormacoes: body.totalFormacoes ?? 0,
          objetivos: body.objetivos || null,
          fundamentacao: body.fundamentacao || null,
          documentoAnexo: body.documentoAnexo || null,
          documentoAnexoId: body.documentoAnexoId || null,
          ativo: body.ativo ?? true,
        },
      });

      // Eixos são projeção estável do plano (nunca criados pelo cliente).
      const eixoByPlano = await syncGradeEixos(tx, { gradeId: created.id, planoId: plano.id });

      // Formações em LOTE na mesma transação — nunca em N requisições separadas.
      if (body.formacoes !== undefined) {
        await reconcileGradeFormacoes(tx, {
          gradeId: created.id,
          planoId: plano.id,
          organizacaoId: user.organizacaoId!,
          nivelFormativo: created.nivelFormativo,
          formacoes: body.formacoes,
          eixoByPlano,
        });
      }

      return tx.gradeFormativa.findUniqueOrThrow({
        where: { id: created.id },
        include: { eixos: { include: { etapas: true } } },
      });
    }, { timeout: 20000 });

    logAction("grade_created", user.id, getClientIp(request), { planoId: body.planoId }, user.organizacaoId);
    return NextResponse.json(toGrade(grade), { status: 201 });
  } catch (err) {
    logError("grades", err);
    return NextResponse.json({ error: "Falha ao criar grade" }, { status: 500 });
  }
}
