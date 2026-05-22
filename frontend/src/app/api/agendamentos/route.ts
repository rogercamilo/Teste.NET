import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { Agendamento } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

type PrismaAg = {
  id: string; organizacaoId: string; formacaoId: string; formacaoTema: string;
  nivelFormativo: string; tipoFormacao: string; formadorId: string;
  formadorNome: string; dataInicio: Date; dataFim: Date; local: string | null;
  linkOnline: string | null; status: string; participantes: number;
  observacoes: string | null; googleCalendarEventId: string | null; criadoEm: Date;
};

function toAg(a: PrismaAg): Agendamento {
  return {
    id: a.id,
    formacaoId: a.formacaoId,
    formacaoTema: a.formacaoTema,
    nivelFormativo: a.nivelFormativo as Agendamento["nivelFormativo"],
    tipoFormacao: a.tipoFormacao as Agendamento["tipoFormacao"],
    formadorId: a.formadorId,
    formadorNome: a.formadorNome,
    dataInicio: a.dataInicio.toISOString(),
    dataFim: a.dataFim.toISOString(),
    local: a.local ?? undefined,
    linkOnline: a.linkOnline ?? undefined,
    status: a.status as Agendamento["status"],
    participantes: a.participantes,
    observacoes: a.observacoes ?? undefined,
    googleCalendarEventId: a.googleCalendarEventId ?? undefined,
    criadoEm: a.criadoEm.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const rows = await prisma.agendamento.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { dataInicio: "asc" },
    });
    return NextResponse.json(rows.map(toAg));
  } catch (err) {
    console.error("[agendamentos GET]", err);
    return NextResponse.json({ error: "Falha ao carregar agendamentos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json() as Partial<Agendamento>;
    if (!body.formacaoId || !body.dataInicio) {
      return NextResponse.json({ error: "formacaoId e dataInicio são obrigatórios" }, { status: 400 });
    }

    // formadorId is always the authenticated user; formadorNome resolved server-side.
    const formadorId = user.id!;
    const formadorUser = await prisma.usuario.findUnique({
      where: { id: formadorId },
      select: { nome: true },
    });
    const formadorNome = formadorUser?.nome ?? "";

    const row = await prisma.agendamento.create({
      data: {
        organizacaoId: user.organizacaoId,
        formacaoId: body.formacaoId,
        formacaoTema: body.formacaoTema ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: body.tipoFormacao ?? "comunitaria",
        formadorId,
        formadorNome,
        dataInicio: new Date(body.dataInicio),
        dataFim: new Date(body.dataFim ?? body.dataInicio),
        local: body.local || null,
        linkOnline: body.linkOnline || null,
        status: body.status ?? "agendada",
        participantes: body.participantes ?? 0,
        observacoes: body.observacoes || null,
        googleCalendarEventId: body.googleCalendarEventId || null,
      },
    });
    logAction("agendamento_created", user.id, getClientIp(request), { formacaoId: body.formacaoId }, user.organizacaoId);
    return NextResponse.json(toAg(row), { status: 201 });
  } catch (err) {
    console.error("[api]", err);
    return NextResponse.json({ error: "Falha ao criar agendamento" }, { status: 500 });
  }
}
