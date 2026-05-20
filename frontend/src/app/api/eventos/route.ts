import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { EventoFormando } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

type PrismaEvento = {
  id: string; organizacaoId: string; formandoId: string; formadorId: string;
  tipo: string; periodoInicio: Date | null; periodoFim: Date | null;
  notaAdesao: string | null; textoAvaliacao: string | null; motivo: string | null;
  tipoDesligamento: string | null; dataEfetiva: Date | null;
  checklistDevolveuEstatuto: boolean | null; checklistDevolveuSacramental: boolean | null;
  checklistApresentouCarta: boolean | null; checklistAcompanhadoModerador: boolean | null;
  dataInicioLicenca: Date | null; dataFimLicenca: Date | null; criadoEm: Date;
};

function toEvento(e: PrismaEvento): EventoFormando {
  return {
    id: e.id,
    formandoId: e.formandoId,
    formadorId: e.formadorId,
    tipo: e.tipo as EventoFormando["tipo"],
    criadoEm: e.criadoEm.toISOString(),
    periodoInicio: e.periodoInicio?.toISOString().split("T")[0],
    periodoFim: e.periodoFim?.toISOString().split("T")[0],
    notaAdesao: e.notaAdesao as EventoFormando["notaAdesao"] ?? undefined,
    textoAvaliacao: e.textoAvaliacao ?? undefined,
    motivo: e.motivo ?? undefined,
    tipoDesligamento: e.tipoDesligamento as EventoFormando["tipoDesligamento"] ?? undefined,
    dataEfetiva: e.dataEfetiva?.toISOString().split("T")[0],
    checklistDevolveuEstatuto: e.checklistDevolveuEstatuto ?? undefined,
    checklistDevolveuSacramental: e.checklistDevolveuSacramental ?? undefined,
    checklistApresentouCarta: e.checklistApresentouCarta ?? undefined,
    checklistAcompanhadoModerador: e.checklistAcompanhadoModerador ?? undefined,
    dataInicioLicenca: e.dataInicioLicenca?.toISOString().split("T")[0],
    dataFimLicenca: e.dataFimLicenca?.toISOString().split("T")[0],
  };
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const formandoId = searchParams.get("formandoId");
  const where: Record<string, unknown> = { organizacaoId: user.organizacaoId };
  if (formandoId) where.formandoId = formandoId;

  const rows = await prisma.eventoFormando.findMany({ where, orderBy: { criadoEm: "desc" } });
  return NextResponse.json(rows.map(toEvento));
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json() as Partial<EventoFormando>;
    if (!body.formandoId || !body.tipo) {
      return NextResponse.json({ error: "formandoId e tipo são obrigatórios" }, { status: 400 });
    }

    const formando = await prisma.formando.findFirst({
      where: { id: body.formandoId, organizacaoId: user.organizacaoId },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const row = await prisma.eventoFormando.create({
      data: {
        organizacaoId: user.organizacaoId,
        formandoId: body.formandoId,
        formadorId: user.id!,
        tipo: body.tipo,
        periodoInicio: body.periodoInicio ? new Date(body.periodoInicio) : null,
        periodoFim: body.periodoFim ? new Date(body.periodoFim) : null,
        notaAdesao: body.notaAdesao || null,
        textoAvaliacao: body.textoAvaliacao || null,
        motivo: body.motivo || null,
        tipoDesligamento: body.tipoDesligamento || null,
        dataEfetiva: body.dataEfetiva ? new Date(body.dataEfetiva) : null,
        checklistDevolveuEstatuto: body.checklistDevolveuEstatuto ?? null,
        checklistDevolveuSacramental: body.checklistDevolveuSacramental ?? null,
        checklistApresentouCarta: body.checklistApresentouCarta ?? null,
        checklistAcompanhadoModerador: body.checklistAcompanhadoModerador ?? null,
        dataInicioLicenca: body.dataInicioLicenca ? new Date(body.dataInicioLicenca) : null,
        dataFimLicenca: body.dataFimLicenca ? new Date(body.dataFimLicenca) : null,
      },
    });
    logAction("evento_created", user.id, getClientIp(request), { formandoId: body.formandoId, tipo: body.tipo }, user.organizacaoId);
    return NextResponse.json(toEvento(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar evento" }, { status: 500 });
  }
}
