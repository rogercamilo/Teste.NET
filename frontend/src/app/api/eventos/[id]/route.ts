import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";
import type { EventoFormando } from "@/types";

import { SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

type Row = { id: string; organizacaoId: string; formandoId: string; formadorId: string; tipo: string; periodoInicio: Date | null; periodoFim: Date | null; notaAdesao: string | null; textoAvaliacao: string | null; motivo: string | null; tipoDesligamento: string | null; dataEfetiva: Date | null; checklistDevolveuEstatuto: boolean | null; checklistDevolveuSacramental: boolean | null; checklistApresentouCarta: boolean | null; checklistAcompanhadoModerador: boolean | null; dataInicioLicenca: Date | null; dataFimLicenca: Date | null; criadoEm: Date };

function toEvento(e: Row): EventoFormando {
  return { id: e.id, formandoId: e.formandoId, formadorId: e.formadorId, tipo: e.tipo as EventoFormando["tipo"], criadoEm: e.criadoEm.toISOString(), periodoInicio: e.periodoInicio?.toISOString().split("T")[0], periodoFim: e.periodoFim?.toISOString().split("T")[0], notaAdesao: e.notaAdesao as EventoFormando["notaAdesao"] ?? undefined, textoAvaliacao: e.textoAvaliacao ?? undefined, motivo: e.motivo ?? undefined, tipoDesligamento: e.tipoDesligamento as EventoFormando["tipoDesligamento"] ?? undefined, dataEfetiva: e.dataEfetiva?.toISOString().split("T")[0], checklistDevolveuEstatuto: e.checklistDevolveuEstatuto ?? undefined, checklistDevolveuSacramental: e.checklistDevolveuSacramental ?? undefined, checklistApresentouCarta: e.checklistApresentouCarta ?? undefined, checklistAcompanhadoModerador: e.checklistAcompanhadoModerador ?? undefined, dataInicioLicenca: e.dataInicioLicenca?.toISOString().split("T")[0], dataFimLicenca: e.dataFimLicenca?.toISOString().split("T")[0] };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const row = await prisma.eventoFormando.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toEvento(row));
  } catch (err) { logError("eventos/[id] GET", err); return NextResponse.json({ error: "Falha ao carregar evento" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.eventoFormando.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (user.role === "formador_comunitario" && existing.formadorId !== user.id) {
      return NextResponse.json({ error: "Sem permissão para editar eventos de outros formadores" }, { status: 403 });
    }
    const body = await request.json() as Partial<EventoFormando>;
    const VALID_TIPOS: ReadonlySet<string> = new Set(["avaliacao-adesao", "solicitacao-desligamento", "desligamento", "licenca"]);
    const VALID_NOTAS: ReadonlySet<string> = new Set(["otima", "boa", "regular", "insuficiente"]);
    const VALID_TIPO_DESLIGAMENTO: ReadonlySet<string> = new Set(["voluntario", "compulsorio"]);
    if (body.tipo !== undefined && !VALID_TIPOS.has(body.tipo)) {
      return NextResponse.json({ error: "Tipo de evento inválido" }, { status: 400 });
    }
    if (body.notaAdesao !== undefined && body.notaAdesao !== null && !VALID_NOTAS.has(body.notaAdesao)) {
      return NextResponse.json({ error: "Nota de adesão inválida" }, { status: 400 });
    }
    if (body.tipoDesligamento !== undefined && body.tipoDesligamento !== null && !VALID_TIPO_DESLIGAMENTO.has(body.tipoDesligamento)) {
      return NextResponse.json({ error: "Tipo de desligamento inválido" }, { status: 400 });
    }
    const updated = await prisma.eventoFormando.update({
      where: { id },
      data: { tipo: body.tipo, periodoInicio: body.periodoInicio ? new Date(body.periodoInicio) : null, periodoFim: body.periodoFim ? new Date(body.periodoFim) : null, notaAdesao: body.notaAdesao ?? null, textoAvaliacao: body.textoAvaliacao ?? null, motivo: body.motivo ?? null, tipoDesligamento: body.tipoDesligamento ?? null, dataEfetiva: body.dataEfetiva ? new Date(body.dataEfetiva) : null, checklistDevolveuEstatuto: body.checklistDevolveuEstatuto ?? null, checklistDevolveuSacramental: body.checklistDevolveuSacramental ?? null, checklistApresentouCarta: body.checklistApresentouCarta ?? null, checklistAcompanhadoModerador: body.checklistAcompanhadoModerador ?? null, dataInicioLicenca: body.dataInicioLicenca ? new Date(body.dataInicioLicenca) : null, dataFimLicenca: body.dataFimLicenca ? new Date(body.dataFimLicenca) : null },
    });
    logAction("evento_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toEvento(updated));
  } catch (err) { logError("eventos/[id] PUT", err); return NextResponse.json({ error: "Falha ao atualizar evento" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.eventoFormando.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (user.role === "formador_comunitario" && existing.formadorId !== user.id) {
      return NextResponse.json({ error: "Sem permissão para excluir eventos de outros formadores" }, { status: 403 });
    }
    await prisma.eventoFormando.delete({ where: { id } });
    logAction("evento_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("eventos/[id] DELETE", err); return NextResponse.json({ error: "Falha ao excluir evento" }, { status: 500 }); }
}
