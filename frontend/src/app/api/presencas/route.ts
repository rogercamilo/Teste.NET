import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { PresencaFormacao } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

type PrismaPresenca = {
  id: string; organizacaoId: string; agendamentoId: string; formacaoTema: string;
  data: Date; formandoId: string; formandoNome: string; nivelFormativo: string;
  presente: boolean; justificativa: string | null;
};

function toPresenca(p: PrismaPresenca): PresencaFormacao {
  return {
    id: p.id,
    agendamentoId: p.agendamentoId,
    formacaoTema: p.formacaoTema,
    data: p.data.toISOString().split("T")[0],
    formandoId: p.formandoId,
    formandoNome: p.formandoNome,
    nivelFormativo: p.nivelFormativo as PresencaFormacao["nivelFormativo"],
    presente: p.presente,
    justificativa: p.justificativa ?? undefined,
  };
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const agendamentoId = searchParams.get("agendamentoId");
  const formandoId = searchParams.get("formandoId");
  const where: Record<string, unknown> = { organizacaoId: user.organizacaoId };
  if (agendamentoId) where.agendamentoId = agendamentoId;
  if (formandoId) where.formandoId = formandoId;

  const rows = await prisma.presencaFormacao.findMany({ where, orderBy: { data: "desc" } });
  return NextResponse.json(rows.map(toPresenca));
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json() as Partial<PresencaFormacao>;
    if (!body.agendamentoId || !body.formandoId) {
      return NextResponse.json({ error: "agendamentoId e formandoId são obrigatórios" }, { status: 400 });
    }

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: body.agendamentoId, organizacaoId: user.organizacaoId },
    });
    if (!agendamento) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

    const formando = await prisma.formando.findFirst({
      where: { id: body.formandoId, organizacaoId: user.organizacaoId },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const row = await prisma.presencaFormacao.upsert({
      where: { agendamentoId_formandoId: { agendamentoId: body.agendamentoId, formandoId: body.formandoId } },
      create: {
        organizacaoId: user.organizacaoId,
        agendamentoId: body.agendamentoId,
        formacaoTema: body.formacaoTema ?? "",
        data: new Date(body.data ?? Date.now()),
        formandoId: body.formandoId,
        formandoNome: body.formandoNome ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        presente: body.presente ?? false,
        justificativa: body.justificativa || null,
      },
      update: {
        presente: body.presente ?? false,
        justificativa: body.justificativa || null,
      },
    });
    logAction("presenca_registrada", user.id, getClientIp(request), { agendamentoId: body.agendamentoId, formandoId: body.formandoId }, user.organizacaoId);
    return NextResponse.json(toPresenca(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao registrar presença" }, { status: 500 });
  }
}
