import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import type { GrupoFormacao } from "@/types";
import { UpdateGrupoFormacaoSchema, isValidId, parseJson } from "@/lib/schemas";

import { isGestao, SessionUser as SU } from "@/lib/auth-helpers";
import { criarNotificacao } from "@/lib/notificacoes";
type Params = { params: Promise<{ id: string }> };
import { toGrupoFormacao } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const row = await prisma.grupoFormacao.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toGrupoFormacao(row));
  } catch (err) { logError("moradas/[id] GET", err); return NextResponse.json({ error: "Falha ao carregar morada" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const isFC = user.role === "formador_comunitario";
  if (!isGestao(user.role) && !isFC) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.grupoFormacao.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    // FC só pode editar a seu próprio grupo de formação e apenas nome/localReuniao/imagemUrl
    if (isFC) {
      if ((user as { grupoFormacaoId?: string | null }).grupoFormacaoId !== id) {
        return NextResponse.json({ error: "Sem permissão para editar este grupo de formação" }, { status: 403 });
      }
      const parsed = await parseJson(request, UpdateGrupoFormacaoSchema);
      if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
      const body = parsed.data;
      const updated = await prisma.grupoFormacao.update({
        where: { id },
        data: {
          ...(body.nome !== undefined && { nome: body.nome }),
          ...(body.localReuniao !== undefined && { localReuniao: body.localReuniao ?? null }),
          ...(body.imagemUrl !== undefined && { imagemUrl: body.imagemUrl ?? null }),
        },
      });
      logAction("grupo_formacao_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
      return NextResponse.json(toGrupoFormacao(updated));
    }

    const parsed = await parseJson(request, UpdateGrupoFormacaoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    if (body.formadorId) {
      const formador = await prisma.usuario.findFirst({
        where: { id: body.formadorId, organizacaoId: user.organizacaoId, deletedAt: null },
      });
      if (!formador) return NextResponse.json({ error: "Formador não encontrado" }, { status: 404 });
    }

    const newFormadorId = body.formadorId ?? null;
    const formadorChanged = "formadorId" in body && newFormadorId !== existing.formadorId;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.grupoFormacao.update({
        where: { id },
        data: {
          ...(body.nome !== undefined && { nome: body.nome }),
          ...(body.localReuniao !== undefined && { localReuniao: body.localReuniao ?? null }),
          ...(body.tipo !== undefined && { tipo: body.tipo }),
          ...(body.nivelFormativo !== undefined && { nivelFormativo: body.nivelFormativo ?? null }),
          ...(body.formadorId !== undefined && { formadorId: body.formadorId ?? null }),
          ...(body.planoId !== undefined && { planoId: body.planoId ?? null }),
          ...(body.gradeId !== undefined && { gradeId: body.gradeId ?? null }),
          ...(body.vigenciaInicio !== undefined && { vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : null }),
          ...(body.vigenciaFim !== undefined && { vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : null }),
          ...(body.imagemUrl !== undefined && { imagemUrl: body.imagemUrl ?? null }),
          ...(body.ativo !== undefined && { ativo: body.ativo }),
        },
      });
      if (formadorChanged) {
        if (existing.formadorId) {
          await tx.usuario.update({ where: { id: existing.formadorId }, data: { grupoFormacaoId: null } });
        }
        if (newFormadorId) {
          await tx.usuario.update({ where: { id: newFormadorId }, data: { grupoFormacaoId: id } });
        }
      }
      return result;
    });
    logAction("grupo_formacao_updated", user.id, getClientIp(request), { id }, user.organizacaoId);

    // Notifica FC se planoId ou gradeId foram atribuídos/trocados
    const fcId = updated.formadorId;
    if (fcId) {
      if ("planoId" in body && body.planoId && body.planoId !== existing.planoId) {
        criarNotificacao({
          organizacaoId: user.organizacaoId!,
          destinatarioId: fcId,
          tipo: "plano_atribuido",
          titulo: "Plano formativo atribuído ao seu grupo",
          corpo: "Um novo plano formativo foi associado ao seu grupo de formação.",
          linkAcao: `/grupos-formacao/${id}`,
        }).catch(() => {});
      }
      if ("gradeId" in body && body.gradeId && body.gradeId !== existing.gradeId) {
        criarNotificacao({
          organizacaoId: user.organizacaoId!,
          destinatarioId: fcId,
          tipo: "grade_atribuida",
          titulo: "Grade formativa atribuída ao seu grupo",
          corpo: "Uma nova grade formativa foi associada ao seu grupo de formação.",
          linkAcao: `/grupos-formacao/${id}`,
        }).catch(() => {});
      }
    }

    return NextResponse.json(toGrupoFormacao(updated));
  } catch (err) {
    logError("moradas/[id] PUT", err);
    return NextResponse.json({ error: "Falha ao atualizar morada" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isGestao(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.grupoFormacao.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.grupoFormacao.deleteMany({ where: { id, organizacaoId: user.organizacaoId } });
    logAction("grupo_formacao_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("moradas/[id] DELETE", err); return NextResponse.json({ error: "Falha ao excluir morada" }, { status: 500 }); }
}
