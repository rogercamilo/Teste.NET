import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";
import type { GradeFormativa, Eixo, Etapa } from "@/types";

const MAX_EIXOS = 50;
const MAX_ETAPAS = 200;

import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

import { toGrade } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const row = await prisma.gradeFormativa.findFirst({
      where: { id, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      include: { eixos: { include: { etapas: true } } },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toGrade(row));
  } catch (err) { logError("grades/[id]", err); return NextResponse.json({ error: "Falha ao carregar grade" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.gradeFormativa.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<GradeFormativa>;

    if ((body.eixos?.length ?? 0) > MAX_EIXOS) {
      return NextResponse.json({ error: `Máximo de ${MAX_EIXOS} eixos permitidos` }, { status: 400 });
    }
    if ((body.etapas?.length ?? 0) > MAX_ETAPAS) {
      return NextResponse.json({ error: `Máximo de ${MAX_ETAPAS} etapas permitidas` }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Delete existing eixos (cascades to etapas)
      await tx.eixo.deleteMany({ where: { gradeId: id } });

      await tx.gradeFormativa.update({
        where: { id },
        data: { nome: body.nome ?? existing.nome, planoId: body.planoId, planoNome: body.planoNome, nivelFormativo: body.nivelFormativo, vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : undefined, vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : undefined, versao: body.versao, totalFormacoes: body.totalFormacoes, objetivos: body.objetivos || null, fundamentacao: body.fundamentacao || null, documentoAnexo: body.documentoAnexo || null, documentoAnexoId: body.documentoAnexoId || null, ativo: body.ativo },
      });

      const eixoEntries = await Promise.all(
        (body.eixos ?? []).map((eixo) =>
          tx.eixo
            .create({ data: { gradeId: id, nome: eixo.nome, descricao: eixo.descricao, ordem: eixo.ordem, cor: eixo.cor || null }, select: { id: true } })
            .then((e) => [eixo.id, e.id] as [string, string])
        )
      );
      const eixoIdMap = new Map(eixoEntries);
      await Promise.all(
        (body.etapas ?? []).map((etapa) => {
          const newEixoId = eixoIdMap.get(etapa.eixoId);
          if (!newEixoId) return Promise.resolve(null);
          return tx.etapa.create({ data: { eixoId: newEixoId, nome: etapa.nome, descricao: etapa.descricao, ordem: etapa.ordem, cargaHoraria: etapa.cargaHoraria } });
        })
      );

      return tx.gradeFormativa.findUniqueOrThrow({ where: { id }, include: { eixos: { include: { etapas: true } } } });
    });

    logAction("grade_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toGrade(updated));
  } catch (err) { logError("grades/[id]", err); return NextResponse.json({ error: "Falha ao atualizar grade" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rlDel = await limiters.mutation(user.id ?? "unknown");
  if (!rlDel.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.gradeFormativa.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.gradeFormativa.delete({ where: { id } });
    logAction("grade_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("grades/[id]", err); return NextResponse.json({ error: "Falha ao excluir grade" }, { status: 500 }); }
}
