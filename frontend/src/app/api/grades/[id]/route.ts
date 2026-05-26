import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { GradeFormativa, Eixo, Etapa } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };

function isAdmin(role?: string) { return role === "administrador" || role === "formador_geral"; }

type PrismaGrade = { id: string; organizacaoId: string | null; nome: string; planoId: string; planoNome: string; nivelFormativo: string; vigenciaInicio: Date; vigenciaFim: Date; versao: string; totalFormacoes: number; objetivos: string | null; fundamentacao: string | null; documentoAnexo: string | null; documentoAnexoId: string | null; ativo: boolean; criadoEm: Date; eixos: { id: string; gradeId: string; nome: string; descricao: string; ordem: number; cor: string | null; etapas: { id: string; eixoId: string; nome: string; descricao: string; ordem: number; cargaHoraria: number }[] }[] };

function toGrade(g: PrismaGrade): GradeFormativa {
  return {
    id: g.id, nome: g.nome, planoId: g.planoId, planoNome: g.planoNome,
    nivelFormativo: g.nivelFormativo as GradeFormativa["nivelFormativo"],
    vigenciaInicio: g.vigenciaInicio.toISOString().split("T")[0], vigenciaFim: g.vigenciaFim.toISOString().split("T")[0],
    versao: g.versao,
    eixos: g.eixos.map((e): Eixo => ({ id: e.id, nome: e.nome, descricao: e.descricao, gradeId: e.gradeId, ordem: e.ordem, cor: e.cor ?? undefined })),
    etapas: g.eixos.flatMap((e) => e.etapas.map((t): Etapa => ({ id: t.id, nome: t.nome, descricao: t.descricao, eixoId: t.eixoId, ordem: t.ordem, cargaHoraria: t.cargaHoraria }))),
    totalFormacoes: g.totalFormacoes, objetivos: g.objetivos ?? undefined, fundamentacao: g.fundamentacao ?? undefined,
    documentoAnexo: g.documentoAnexo ?? undefined, documentoAnexoId: g.documentoAnexoId ?? undefined,
    ativo: g.ativo, criadoEm: g.criadoEm.toISOString(),
  };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const row = await prisma.gradeFormativa.findFirst({
      where: { id, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      include: { eixos: { include: { etapas: true } } },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toGrade(row));
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao carregar grade" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await prisma.gradeFormativa.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<GradeFormativa>;

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
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao atualizar grade" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await prisma.gradeFormativa.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.gradeFormativa.delete({ where: { id } });
    logAction("grade_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao excluir grade" }, { status: 500 }); }
}
