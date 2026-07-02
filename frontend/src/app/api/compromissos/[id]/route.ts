import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { UpdateCompromissoSchema, isValidId, parseJson } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import { SessionUser as SU } from "@/lib/auth-helpers";
import { toCompromisso } from "@/lib/converters";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    // Guard de propriedade: só o dono (formadorId = user.id) vê/edita.
    const existing = await prisma.compromisso.findFirst({
      where: { id, organizacaoId: user.organizacaoId, formadorId: user.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const parsed = await parseJson(request, UpdateCompromissoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    // Revalida vínculo a formando quando enviado.
    let formandoUpdate: { formandoId: string | null; formandoNome: string | null } | undefined;
    if (body.formandoId !== undefined) {
      if (body.formandoId) {
        const formando = await prisma.formando.findFirst({
          where: { id: body.formandoId, organizacaoId: user.organizacaoId, deletedAt: null },
          select: { id: true, nome: true },
        });
        if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
        formandoUpdate = { formandoId: formando.id, formandoNome: formando.nome };
      } else {
        formandoUpdate = { formandoId: null, formandoNome: null };
      }
    }

    const updated = await prisma.compromisso.update({
      where: { id },
      data: {
        titulo: body.titulo,
        descricao: body.descricao !== undefined ? (body.descricao || null) : undefined,
        tipo: body.tipo,
        dataInicio: body.dataInicio ? new Date(body.dataInicio) : undefined,
        dataFim: body.dataFim ? new Date(body.dataFim) : undefined,
        local: body.local !== undefined ? (body.local || null) : undefined,
        linkOnline: body.linkOnline !== undefined ? (body.linkOnline || null) : undefined,
        ...(formandoUpdate ?? {}),
      },
    });
    logAction("compromisso_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toCompromisso(updated));
  } catch (err) {
    logError("compromissos/:id PUT", err);
    return NextResponse.json({ error: "Falha ao atualizar compromisso" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const existing = await prisma.compromisso.findFirst({
      where: { id, organizacaoId: user.organizacaoId, formadorId: user.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    await prisma.compromisso.delete({ where: { id } });
    logAction("compromisso_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logError("compromissos/:id DELETE", err);
    return NextResponse.json({ error: "Falha ao excluir compromisso" }, { status: 500 });
  }
}
