import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import type { Agendamento } from "@/types";
import { UpdateAgendamentoSchema, parseBody, isValidId } from "@/lib/schemas";
import { sendPushToOrg } from "@/lib/push";
import { formatDataBr } from "@/lib/utils";
import { verificarUltimoRetiroVocacional } from "@/lib/vocacional-triggers";

import { SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

import { toAgendamento as toAg } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const { id } = await params;
    if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
    const row = await prisma.agendamento.findFirst({ where: { id, organizacaoId: user.organizacaoId, deletedAt: null } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toAg(row));
  } catch (err) {
    logError("agendamentos/:id GET", err);
    return NextResponse.json({ error: "Falha ao carregar agendamento" }, { status: 500 });
  }
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
    const existing = await prisma.agendamento.findFirst({ where: { id, organizacaoId: user.organizacaoId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (user.role === "formador_comunitario" && existing.grupoFormacaoId !== (user.grupoFormacaoId ?? null)) {
      return NextResponse.json({ error: "Sem permissão para modificar este agendamento" }, { status: 403 });
    }
    const parsed = parseBody(UpdateAgendamentoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;
    const updated = await prisma.agendamento.update({
      where: { id, organizacaoId: user.organizacaoId },
      data: { formacaoTema: body.formacaoTema, nivelFormativo: body.nivelFormativo, tipoFormacao: body.tipoFormacao, grupoFormacaoId: body.grupoFormacaoId !== undefined ? (body.grupoFormacaoId ?? null) : undefined, dataInicio: body.dataInicio ? new Date(body.dataInicio) : undefined, dataFim: body.dataFim ? new Date(body.dataFim) : undefined, local: body.local ?? null, linkOnline: body.linkOnline ?? null, status: body.status, participantes: body.participantes, observacoes: body.observacoes ?? null },
    });
    logAction("agendamento_updated", user.id, getClientIp(request), { id }, user.organizacaoId);

    // Gatilho do último retiro do Período Vocacional — best-effort
    if (body.status === "realizada" && existing.status !== "realizada" && updated.grupoFormacaoId) {
      verificarUltimoRetiroVocacional(updated.grupoFormacaoId).catch(() => {});
    }

    // Notificação push para mudanças de status relevantes — fire-and-forget
    if (body.status && body.status !== existing.status) {
      const dataStr = formatDataBr(updated.dataInicio);
      const pushMap: Partial<Record<string, string>> = {
        confirmada: `${updated.formacaoTema} confirmada para ${dataStr}`,
        cancelada: `${updated.formacaoTema} de ${dataStr} foi cancelada`,
        reagendada: `${updated.formacaoTema} foi remarcada para ${dataStr}`,
      };
      const corpo = pushMap[body.status];
      if (corpo) {
        sendPushToOrg(user.organizacaoId, {
          titulo: "Atualização de formação",
          corpo,
          url: "/agenda",
        }).catch(() => {});
      }
    }

    return NextResponse.json(toAg(updated));
  } catch (err) { logError("agendamentos/:id PUT", err); return NextResponse.json({ error: "Falha ao atualizar agendamento" }, { status: 500 }); }
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
    const existing = await prisma.agendamento.findFirst({ where: { id, organizacaoId: user.organizacaoId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (user.role === "formador_comunitario" && existing.grupoFormacaoId !== (user.grupoFormacaoId ?? null)) {
      return NextResponse.json({ error: "Sem permissão para excluir este agendamento" }, { status: 403 });
    }
    await prisma.agendamento.update({ where: { id, organizacaoId: user.organizacaoId }, data: { deletedAt: new Date() } });
    logAction("agendamento_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("agendamentos/:id DELETE", err); return NextResponse.json({ error: "Falha ao excluir agendamento" }, { status: 500 }); }
}
