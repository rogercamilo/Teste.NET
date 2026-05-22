import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { Morada } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };
type Row = { id: string; organizacaoId: string; nome: string; endereco: string | null; nivelFormativo: string; formadorId: string | null; planoId: string | null; gradeId: string | null; vigenciaInicio: Date | null; vigenciaFim: Date | null; ativo: boolean; criadoEm: Date };

function isAdmin(role?: string) { return role === "administrador" || role === "formador_geral"; }
function toMorada(m: Row): Morada {
  return { id: m.id, nome: m.nome, endereco: m.endereco ?? undefined, nivelFormativo: m.nivelFormativo as Morada["nivelFormativo"], formadorId: m.formadorId ?? undefined, planoId: m.planoId ?? undefined, gradeId: m.gradeId ?? undefined, vigenciaInicio: m.vigenciaInicio?.toISOString().split("T")[0], vigenciaFim: m.vigenciaFim?.toISOString().split("T")[0], ativo: m.ativo, criadoEm: m.criadoEm.toISOString() };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const row = await prisma.morada.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toMorada(row));
  } catch (err) { console.error("[moradas/:id GET]", err); return NextResponse.json({ error: "Falha ao carregar morada" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await prisma.morada.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<Morada>;

    if (body.formadorId) {
      const formador = await prisma.usuario.findFirst({
        where: { id: body.formadorId, organizacaoId: user.organizacaoId },
      });
      if (!formador) return NextResponse.json({ error: "Formador não encontrado" }, { status: 400 });
    }

    const updated = await prisma.morada.update({
      where: { id },
      data: { nome: body.nome?.trim(), endereco: body.endereco || null, nivelFormativo: body.nivelFormativo, formadorId: body.formadorId || null, planoId: body.planoId || null, gradeId: body.gradeId || null, vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : null, vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : null, ativo: body.ativo },
    });
    logAction("morada_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toMorada(updated));
  } catch (err) { console.error("[api]", err); return NextResponse.json({ error: "Falha ao atualizar morada" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params;
  try {
    const existing = await prisma.morada.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.morada.delete({ where: { id } });
    logAction("morada_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { console.error("[api]", err); return NextResponse.json({ error: "Falha ao excluir morada" }, { status: 500 }); }
}
