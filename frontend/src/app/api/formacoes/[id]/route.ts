import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import type { Formacao } from "@/types";
import { UpdateFormacaoSchema, parseBody, isValidId } from "@/lib/schemas";

import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

import { toFormacao } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const row = await prisma.formacao.findFirst({
      where: { id, deletedAt: null, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toFormacao(row));
  } catch (err) { logError("formacoes/:id GET", err); return NextResponse.json({ error: "Falha ao carregar formação" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.formacao.findFirst({ where: { id, organizacaoId: user.organizacaoId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const parsed = parseBody(UpdateFormacaoSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;
    const updated = await prisma.formacao.update({ where: { id }, data: { tema: body.tema, objetivo: body.objetivo, descricao: body.descricao, nivelFormativo: body.nivelFormativo, tipoFormacao: body.tipoFormacao, eixoId: body.eixoId ?? null, eixoNome: body.eixoNome ?? null, etapaId: body.etapaId ?? null, etapaNome: body.etapaNome ?? null, formadorNome: body.formadorNome, cargaHoraria: body.cargaHoraria, modalidade: body.modalidade, materialApoio: body.materialApoio ?? null, documentoAnexo: body.documentoAnexo ?? null, documentoAnexoId: body.documentoAnexoId ?? null, gradeId: body.gradeId ?? null, gradeNome: body.gradeNome ?? null, numero: body.numero !== undefined ? (body.numero ?? null) : undefined, observacoesFormador: body.observacoesFormador !== undefined ? (body.observacoesFormador || null) : undefined, vezesUtilizada: body.vezesUtilizada } });
    logAction("formacao_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toFormacao(updated));
  } catch (err) { logError("formacoes/:id PUT", err); return NextResponse.json({ error: "Falha ao atualizar formação" }, { status: 500 }); }
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
    const existing = await prisma.formacao.findFirst({ where: { id, organizacaoId: user.organizacaoId, deletedAt: null } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.formacao.update({ where: { id }, data: { deletedAt: new Date() } });
    logAction("formacao_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("formacoes/:id DELETE", err); return NextResponse.json({ error: "Falha ao excluir formação" }, { status: 500 }); }
}
