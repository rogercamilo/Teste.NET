import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { PlanoFormativo, EixoPlano } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };

function isAdmin(role?: string) { return role === "administrador" || role === "formador_geral"; }

type PrismaPlano = { id: string; organizacaoId: string | null; nome: string; objetivos: string; fundamentacao: string; nivelFormativo: string; vigenciaInicio: Date; vigenciaFim: Date; status: string; documentoAnexo: string | null; documentoAnexoId: string | null; criadoEm: Date; atualizadoEm: Date; eixos: { id: string; nome: string; objetivo: string; intervaloEncontros: string; cargaHoraria: number; areaFormacao: string }[] };

function toPlano(p: PrismaPlano): PlanoFormativo {
  return {
    id: p.id, nome: p.nome, objetivos: p.objetivos, fundamentacao: p.fundamentacao,
    nivelFormativo: p.nivelFormativo as PlanoFormativo["nivelFormativo"],
    eixos: p.eixos.map((e): EixoPlano => ({ id: e.id, nome: e.nome, objetivo: e.objetivo, intervaloEncontros: e.intervaloEncontros, cargaHoraria: e.cargaHoraria, areaFormacao: e.areaFormacao })),
    vigenciaInicio: p.vigenciaInicio.toISOString().split("T")[0],
    vigenciaFim: p.vigenciaFim.toISOString().split("T")[0],
    status: p.status as PlanoFormativo["status"],
    documentoAnexo: p.documentoAnexo ?? undefined, documentoAnexoId: p.documentoAnexoId ?? undefined,
    criadoEm: p.criadoEm.toISOString(), atualizadoEm: p.atualizadoEm.toISOString(),
  };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const row = await prisma.planoFormativo.findFirst({
      where: { id, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      include: { eixos: true },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toPlano(row));
  } catch (err) { logError("planos/[id]", err); return NextResponse.json({ error: "Falha ao carregar plano" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await prisma.planoFormativo.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<PlanoFormativo>;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.eixoPlano.deleteMany({ where: { planoId: id } });
      return tx.planoFormativo.update({
        where: { id },
        data: {
          nome: body.nome?.trim(), objetivos: body.objetivos, fundamentacao: body.fundamentacao,
          nivelFormativo: body.nivelFormativo,
          vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : undefined,
          vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : undefined,
          status: body.status, documentoAnexo: body.documentoAnexo || null, documentoAnexoId: body.documentoAnexoId || null,
          eixos: { create: (body.eixos ?? []).map((e) => ({ nome: e.nome, objetivo: e.objetivo, intervaloEncontros: e.intervaloEncontros, cargaHoraria: e.cargaHoraria, areaFormacao: e.areaFormacao })) },
        },
        include: { eixos: true },
      });
    });
    logAction("plano_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toPlano(updated));
  } catch (err) { logError("planos/[id]", err); return NextResponse.json({ error: "Falha ao atualizar plano" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await prisma.planoFormativo.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.planoFormativo.delete({ where: { id } });
    logAction("plano_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("planos/[id]", err); return NextResponse.json({ error: "Falha ao excluir plano" }, { status: 500 }); }
}
