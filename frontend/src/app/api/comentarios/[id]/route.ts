import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { ComentarioFormando } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };

type Row = { id: string; organizacaoId: string; formandoId: string; formandoNome: string; formadorId: string; formadorNome: string | null; texto: string; tipo: string; criadoEm: Date };

function toComentario(c: Row): ComentarioFormando {
  return { id: c.id, formandoId: c.formandoId, formandoNome: c.formandoNome, formadorId: c.formadorId, formadorNome: c.formadorNome ?? undefined, texto: c.texto, tipo: c.tipo as ComentarioFormando["tipo"], criadoEm: c.criadoEm.toISOString() };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const row = await prisma.comentarioFormando.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toComentario(row));
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao carregar comentário" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.comentarioFormando.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<ComentarioFormando>;
    const updated = await prisma.comentarioFormando.update({ where: { id }, data: { texto: body.texto?.trim(), tipo: body.tipo } });
    logAction("comentario_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toComentario(updated));
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao atualizar comentário" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.comentarioFormando.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.comentarioFormando.delete({ where: { id } });
    logAction("comentario_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao excluir comentário" }, { status: 500 }); }
}
