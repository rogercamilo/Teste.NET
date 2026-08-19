import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { UpdateAgendamentoSchema, isValidId, parseJson } from "@/lib/schemas";
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
    const parsed = await parseJson(request, UpdateAgendamentoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    // Item 1.7: grupos-alvo (só quando enviados). Valida org e escopo do FC.
    let targetGroups: string[] | undefined;
    if (body.grupoFormacaoIds !== undefined || body.grupoFormacaoId !== undefined) {
      targetGroups = [...new Set(body.grupoFormacaoIds ?? (body.grupoFormacaoId ? [body.grupoFormacaoId] : []))];
      if (user.role === "formador_comunitario" && targetGroups.some((g) => g !== user.grupoFormacaoId)) {
        return NextResponse.json({ error: "Sem permissão para agendar em outra morada" }, { status: 403 });
      }
      if (targetGroups.length > 0) {
        const validos = await prisma.grupoFormacao.count({
          where: { id: { in: targetGroups }, organizacaoId: user.organizacaoId },
        });
        if (validos !== targetGroups.length) {
          return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });
        }
      }
    }

    // Remarcação: se a data de início mudar, rearmar os lembretes (T-24h/T-2h)
    // para o novo horário zerando as flags de idempotência.
    const novaDataInicio = body.dataInicio ? new Date(body.dataInicio) : undefined;
    const dataMudou = !!novaDataInicio && novaDataInicio.getTime() !== existing.dataInicio.getTime();
    const updated = await prisma.agendamento.update({
      where: { id, organizacaoId: user.organizacaoId },
      data: { tipoEvento: body.tipoEvento, formacaoTema: body.formacaoTema, nivelFormativo: body.nivelFormativo, tipoFormacao: body.tipoFormacao, grupoFormacaoId: targetGroups !== undefined ? (targetGroups.length === 1 ? targetGroups[0] : null) : undefined, dataInicio: novaDataInicio, dataFim: body.dataFim ? new Date(body.dataFim) : undefined, local: body.local ?? null, linkOnline: body.linkOnline ?? null, status: body.status, participantes: body.participantes, observacoes: body.observacoes ?? null, ...(dataMudou ? { lembrete24hEnviado: false, lembrete2hEnviado: false } : {}) },
    });

    // Substitui a junção de grupos-alvo (item 1.7) quando enviada.
    if (targetGroups !== undefined) {
      await prisma.agendamentoGrupo.deleteMany({ where: { agendamentoId: id } });
      if (targetGroups.length > 0) {
        await prisma.agendamentoGrupo.createMany({
          data: targetGroups.map((gid) => ({ agendamentoId: id, grupoFormacaoId: gid })),
        });
      }
    }
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

// PATCH: atualização parcial (mudança de status, reagendamento, edição de campos).
// Mesma lógica do PUT — o UpdateAgendamentoSchema já é `.partial()`, então aceita
// payloads enxutos como `{ status }`. Sem este handler, o Next.js respondia 405 e a
// UI mostrava "Erro ao atualizar status." ao confirmar/cancelar.
export const PATCH = PUT;

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
