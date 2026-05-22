import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { Agendamento } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };

type Row = { id: string; organizacaoId: string; formacaoId: string; formacaoTema: string; nivelFormativo: string; tipoFormacao: string; formadorId: string; formadorNome: string; dataInicio: Date; dataFim: Date; local: string | null; linkOnline: string | null; status: string; participantes: number; observacoes: string | null; googleCalendarEventId: string | null; criadoEm: Date };

function toAg(a: Row): Agendamento {
  return { id: a.id, formacaoId: a.formacaoId, formacaoTema: a.formacaoTema, nivelFormativo: a.nivelFormativo as Agendamento["nivelFormativo"], tipoFormacao: a.tipoFormacao as Agendamento["tipoFormacao"], formadorId: a.formadorId, formadorNome: a.formadorNome, dataInicio: a.dataInicio.toISOString(), dataFim: a.dataFim.toISOString(), local: a.local ?? undefined, linkOnline: a.linkOnline ?? undefined, status: a.status as Agendamento["status"], participantes: a.participantes, observacoes: a.observacoes ?? undefined, googleCalendarEventId: a.googleCalendarEventId ?? undefined, criadoEm: a.criadoEm.toISOString() };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const { id } = await params;
    const row = await prisma.agendamento.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toAg(row));
  } catch (err) {
    console.error("[agendamentos/:id GET]", err);
    return NextResponse.json({ error: "Falha ao carregar agendamento" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.agendamento.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<Agendamento>;
    const updated = await prisma.agendamento.update({
      where: { id },
      data: { formacaoTema: body.formacaoTema, nivelFormativo: body.nivelFormativo, tipoFormacao: body.tipoFormacao, formadorNome: body.formadorNome, dataInicio: body.dataInicio ? new Date(body.dataInicio) : undefined, dataFim: body.dataFim ? new Date(body.dataFim) : undefined, local: body.local || null, linkOnline: body.linkOnline || null, status: body.status, participantes: body.participantes, observacoes: body.observacoes || null },
    });
    logAction("agendamento_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toAg(updated));
  } catch (err) { console.error("[api]", err); return NextResponse.json({ error: "Falha ao atualizar agendamento" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.agendamento.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.agendamento.delete({ where: { id } });
    logAction("agendamento_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { console.error("[api]", err); return NextResponse.json({ error: "Falha ao excluir agendamento" }, { status: 500 }); }
}
