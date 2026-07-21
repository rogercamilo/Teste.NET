import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId, UpdatePresencaSchema, parseJson } from "@/lib/schemas";

import { SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

import { toPresenca } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const row = await prisma.presencaFormacao.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toPresenca(row));
  } catch (err) { logError("presencas/[id] GET", err); return NextResponse.json({ error: "Falha ao carregar presença" }, { status: 500 }); }
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
    const existing = await prisma.presencaFormacao.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
      ...(user.role === "formador_comunitario" && { include: { formando: { select: { grupoFormacaoId: true } } } }),
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (user.role === "formador_comunitario") {
      const formando = existing as typeof existing & { formando: { grupoFormacaoId: string | null } };
      if (!user.grupoFormacaoId || formando.formando.grupoFormacaoId !== user.grupoFormacaoId) {
        return NextResponse.json({ error: "Sem permissão para editar esta presença" }, { status: 403 });
      }
    }
    const parsedBody = await parseJson(request, UpdatePresencaSchema);
    if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    const updated = await prisma.presencaFormacao.update({
      where: { id, organizacaoId: user.organizacaoId },
      data: {
        presente: parsedBody.data.presente ?? existing.presente,
        justificativa: parsedBody.data.justificativa ?? null,
      },
    });
    logAction("presenca_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toPresenca(updated));
  } catch (err) { logError("presencas/[id] PUT", err); return NextResponse.json({ error: "Falha ao atualizar presença" }, { status: 500 }); }
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
    const existing = await prisma.presencaFormacao.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
      ...(user.role === "formador_comunitario" && { include: { formando: { select: { grupoFormacaoId: true } } } }),
    });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (user.role === "formador_comunitario") {
      const formando = existing as typeof existing & { formando: { grupoFormacaoId: string | null } };
      if (!user.grupoFormacaoId || formando.formando.grupoFormacaoId !== user.grupoFormacaoId) {
        return NextResponse.json({ error: "Sem permissão para excluir esta presença" }, { status: 403 });
      }
    }
    await prisma.presencaFormacao.deleteMany({ where: { id, organizacaoId: user.organizacaoId } });
    logAction("presenca_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("presencas/[id] DELETE", err); return NextResponse.json({ error: "Falha ao excluir presença" }, { status: 500 }); }
}
