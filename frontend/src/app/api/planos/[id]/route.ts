import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { UpdatePlanoSchema, isValidId, parseJson } from "@/lib/schemas";
import type { PlanoFormativo, EixoPlano } from "@/types";

import { isGestao, SessionUser as SU } from "@/lib/auth-helpers";
import { criarNotificacoes, formadoresDoPlano } from "@/lib/notificacoes";
type Params = { params: Promise<{ id: string }> };

import { toPlano } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const row = await prisma.planoFormativo.findFirst({
      where: { id, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      include: { eixos: true, retiros: true },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toPlano(row));
  } catch (err) { logError("planos/[id]", err); return NextResponse.json({ error: "Falha ao carregar plano" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isGestao(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.planoFormativo.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const parsed = await parseJson(request, UpdatePlanoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const updated = await prisma.$transaction(async (tx) => {
      if (body.eixos !== undefined) await tx.eixoPlano.deleteMany({ where: { planoId: id } });
      if (body.retiros !== undefined) await tx.retiroPlano.deleteMany({ where: { planoId: id } });
      return tx.planoFormativo.update({
        where: { id },
        data: {
          nome: body.nome?.trim(), objetivos: body.objetivos, fundamentacao: body.fundamentacao,
          nivelFormativo: body.nivelFormativo,
          vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : undefined,
          vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : undefined,
          status: body.status, documentoAnexo: body.documentoAnexo || null, documentoAnexoId: body.documentoAnexoId || null,
          ...(body.eixos !== undefined && {
            eixos: {
              create: body.eixos.map((e) => ({
                nome: e.nome, nomeEtapa: e.nomeEtapa || null, objetivo: e.objetivo,
                intervaloEncontros: e.intervaloEncontros, cargaHoraria: e.cargaHoraria,
                areaFormacao: e.areaFormacao, ordem: e.ordem,
              })),
            },
          }),
          ...(body.retiros !== undefined && {
            retiros: {
              create: body.retiros.map((r) => ({
                tipo: r.tipo, numero: r.numero, tema: r.tema,
                trechoBiblico: r.trechoBiblico || null, objetivo: r.objetivo,
                quandoRealizar: r.quandoRealizar, cargaHoraria: r.cargaHoraria,
              })),
            },
          }),
        },
        include: { eixos: true, retiros: true },
      });
    });
    logAction("plano_updated", user.id, getClientIp(request), { id }, user.organizacaoId);

    // Notifica todos os FCs cujos grupos usam este plano
    formadoresDoPlano(id).then((fcs) => {
      if (fcs.length === 0) return;
      criarNotificacoes(fcs.map(({ formadorId, organizacaoId }) => ({
        organizacaoId,
        destinatarioId: formadorId,
        tipo: "plano_atualizado" as const,
        titulo: "Plano formativo do seu grupo foi atualizado",
        corpo: `O plano "${updated.nome}" foi atualizado. Confira as alterações.`,
        linkAcao: `/planos/${id}`,
      })));
    }).catch(() => {});

    return NextResponse.json(toPlano(updated));
  } catch (err) { logError("planos/[id]", err); return NextResponse.json({ error: "Falha ao atualizar plano" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isGestao(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rlDel = await limiters.mutation(user.id ?? "unknown");
  if (!rlDel.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.planoFormativo.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.planoFormativo.delete({ where: { id } });
    logAction("plano_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("planos/[id]", err); return NextResponse.json({ error: "Falha ao excluir plano" }, { status: 500 }); }
}
