import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { UpdateLeituraSchema, parseJson } from "@/lib/schemas";
import { requireTurmaLeituraAccess } from "../access";

type Params = { params: Promise<{ id: string; leituraId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, leituraId } = await params;
  const guard = await requireTurmaLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { user, organizacaoId, turmaId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    // Escopo por turma + org: nunca confia no id cru (evita IDOR cross-tenant).
    const existente = await prisma.leituraVocacional.findFirst({
      where: { id: leituraId, turmaId, organizacaoId },
      select: { id: true },
    });
    if (!existente) return NextResponse.json({ error: "Leitura não encontrada" }, { status: 404 });

    const parsed = await parseJson(request, UpdateLeituraSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { titulo, autor, ordem, ativo, capitulos } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.leituraVocacional.update({
        where: { id: leituraId },
        data: {
          ...(titulo !== undefined ? { titulo } : {}),
          ...(autor !== undefined ? { autor: autor || null } : {}),
          ...(ordem !== undefined ? { ordem } : {}),
          ...(ativo !== undefined ? { ativo } : {}),
        },
      });
      // Quando os capítulos vêm, substituem o conjunto e são renumerados 1..N.
      if (capitulos) {
        await tx.capituloLeitura.deleteMany({ where: { leituraId } });
        await tx.capituloLeitura.createMany({
          data: capitulos.map((t, i) => ({ leituraId, numero: i + 1, titulo: t })),
        });
      }
    });

    const atualizada = await prisma.leituraVocacional.findUnique({
      where: { id: leituraId },
      include: {
        capitulos: { orderBy: { numero: "asc" }, select: { id: true, numero: true, titulo: true } },
      },
    });

    logAction("vocacional_leitura_editada", user.id, getClientIp(request), { turmaId, leituraId }, organizacaoId);
    return NextResponse.json(atualizada);
  } catch (err) {
    logError("vocacional leitura PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar leitura" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id, leituraId } = await params;
  const guard = await requireTurmaLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { user, organizacaoId, turmaId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const existente = await prisma.leituraVocacional.findFirst({
      where: { id: leituraId, turmaId, organizacaoId },
      select: { id: true },
    });
    if (!existente) return NextResponse.json({ error: "Leitura não encontrada" }, { status: 404 });

    await prisma.leituraVocacional.delete({ where: { id: leituraId } });

    logAction("vocacional_leitura_removida", user.id, getClientIp(request), { turmaId, leituraId }, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("vocacional leitura DELETE", err);
    return NextResponse.json({ error: "Falha ao remover leitura" }, { status: 500 });
  }
}
