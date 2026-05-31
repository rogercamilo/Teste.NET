import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import type { Morada } from "@/types";
import { UpdateMoradaSchema, parseBody, isValidId } from "@/lib/schemas";

import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };
import { toMorada } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const row = await prisma.morada.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toMorada(row));
  } catch (err) { logError("moradas/[id] GET", err); return NextResponse.json({ error: "Falha ao carregar morada" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const isFC = user.role === "formador_comunitario";
  if (!isAdmin(user.role) && !isFC) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.morada.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    // FC só pode editar a sua própria morada e apenas nome/localReuniao
    if (isFC) {
      if ((user as { moradaId?: string | null }).moradaId !== id) {
        return NextResponse.json({ error: "Sem permissão para editar esta morada" }, { status: 403 });
      }
      const body = await request.json() as { nome?: string; localReuniao?: string | null; imagemUrl?: string | null };
      const updated = await prisma.morada.update({
        where: { id },
        data: {
          ...(body.nome !== undefined && { nome: body.nome }),
          ...(body.localReuniao !== undefined && { localReuniao: body.localReuniao ?? null }),
          ...(body.imagemUrl !== undefined && { imagemUrl: body.imagemUrl ?? null }),
        },
      });
      logAction("morada_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
      return NextResponse.json(toMorada(updated));
    }

    const parsed = parseBody(UpdateMoradaSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    if (body.formadorId) {
      const formador = await prisma.usuario.findFirst({
        where: { id: body.formadorId, organizacaoId: user.organizacaoId },
      });
      if (!formador) return NextResponse.json({ error: "Formador não encontrado" }, { status: 400 });
    }

    const newFormadorId = body.formadorId ?? null;
    const formadorChanged = "formadorId" in body && newFormadorId !== existing.formadorId;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.morada.update({
        where: { id },
        data: {
          ...(body.nome !== undefined && { nome: body.nome }),
          ...(body.localReuniao !== undefined && { localReuniao: body.localReuniao ?? null }),
          ...(body.nivelFormativo !== undefined && { nivelFormativo: body.nivelFormativo }),
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
          await tx.usuario.update({ where: { id: existing.formadorId }, data: { moradaId: null } });
        }
        if (newFormadorId) {
          await tx.usuario.update({ where: { id: newFormadorId }, data: { moradaId: id } });
        }
      }
      return result;
    });
    logAction("morada_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toMorada(updated));
  } catch (err) { logError("moradas/[id] PUT", err); return NextResponse.json({ error: "Falha ao atualizar morada" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.morada.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.morada.delete({ where: { id } });
    logAction("morada_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("moradas/[id] DELETE", err); return NextResponse.json({ error: "Falha ao excluir morada" }, { status: 500 }); }
}
