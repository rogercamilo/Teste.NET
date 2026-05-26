import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { PresencaFormacao } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };

type Row = { id: string; organizacaoId: string; agendamentoId: string; formacaoTema: string; data: Date; formandoId: string; formandoNome: string; nivelFormativo: string; presente: boolean; justificativa: string | null };

function toPresenca(p: Row): PresencaFormacao {
  return { id: p.id, agendamentoId: p.agendamentoId, formacaoTema: p.formacaoTema, data: p.data.toISOString().split("T")[0], formandoId: p.formandoId, formandoNome: p.formandoNome, nivelFormativo: p.nivelFormativo as PresencaFormacao["nivelFormativo"], presente: p.presente, justificativa: p.justificativa ?? undefined };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const row = await prisma.presencaFormacao.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toPresenca(row));
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao carregar presença" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.presencaFormacao.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<PresencaFormacao>;
    const updated = await prisma.presencaFormacao.update({ where: { id }, data: { presente: body.presente, justificativa: body.justificativa || null } });
    logAction("presenca_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toPresenca(updated));
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao atualizar presença" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.presencaFormacao.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.presencaFormacao.delete({ where: { id } });
    logAction("presenca_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("", err); return NextResponse.json({ error: "Falha ao excluir presença" }, { status: 500 }); }
}
