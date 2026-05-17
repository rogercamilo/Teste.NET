import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { Formacao } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };

function isAdmin(role?: string) { return role === "administrador" || role === "formador_geral"; }

type Row = { id: string; organizacaoId: string | null; tema: string; objetivo: string; descricao: string; nivelFormativo: string; tipoFormacao: string; eixoId: string | null; eixoNome: string | null; etapaId: string | null; etapaNome: string | null; formadorId: string | null; formadorNome: string; cargaHoraria: number; modalidade: string; materialApoio: string | null; documentoAnexo: string | null; documentoAnexoId: string | null; gradeId: string | null; gradeNome: string | null; vezesUtilizada: number; criadoEm: Date };

function toFormacao(f: Row): Formacao {
  return { id: f.id, tema: f.tema, objetivo: f.objetivo, descricao: f.descricao, nivelFormativo: f.nivelFormativo as Formacao["nivelFormativo"], tipoFormacao: f.tipoFormacao as Formacao["tipoFormacao"], eixoId: f.eixoId ?? undefined, eixoNome: f.eixoNome ?? undefined, etapaId: f.etapaId ?? undefined, etapaNome: f.etapaNome ?? undefined, formadorId: f.formadorId ?? "", formadorNome: f.formadorNome, cargaHoraria: f.cargaHoraria, modalidade: f.modalidade as Formacao["modalidade"], materialApoio: f.materialApoio ?? undefined, documentoAnexo: f.documentoAnexo ?? undefined, documentoAnexoId: f.documentoAnexoId ?? undefined, gradeId: f.gradeId ?? undefined, gradeNome: f.gradeNome ?? undefined, vezesUtilizada: f.vezesUtilizada, criadoEm: f.criadoEm.toISOString() };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  const row = await prisma.formacao.findFirst({ where: { id } });
  if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(toFormacao(row));
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await prisma.formacao.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<Formacao>;
    const updated = await prisma.formacao.update({ where: { id }, data: { tema: body.tema?.trim(), objetivo: body.objetivo, descricao: body.descricao, nivelFormativo: body.nivelFormativo, tipoFormacao: body.tipoFormacao, eixoId: body.eixoId || null, eixoNome: body.eixoNome || null, etapaId: body.etapaId || null, etapaNome: body.etapaNome || null, formadorNome: body.formadorNome, cargaHoraria: body.cargaHoraria, modalidade: body.modalidade, materialApoio: body.materialApoio || null, documentoAnexo: body.documentoAnexo || null, documentoAnexoId: body.documentoAnexoId || null, gradeId: body.gradeId || null, gradeNome: body.gradeNome || null, vezesUtilizada: body.vezesUtilizada } });
    logAction("formacao_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toFormacao(updated));
  } catch { return NextResponse.json({ error: "Falha ao atualizar formação" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await prisma.formacao.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.formacao.delete({ where: { id } });
    logAction("formacao_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch { return NextResponse.json({ error: "Falha ao excluir formação" }, { status: 500 }); }
}
