import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";
import { isValidId } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

// Atualiza dataMissaCompromisso e/ou iniciouEm da etapa ATUAL de todos os formandos da morada.
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const isFC = user.role === "formador_comunitario";
  if (!isAdmin(user.role) && !isFC) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const morada = await prisma.morada.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!morada) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    if (isFC && (user as SU & { moradaId?: string | null }).moradaId !== id) {
      return NextResponse.json({ error: "Sem permissão para editar esta morada" }, { status: 403 });
    }

    const body = await request.json() as {
      dataMissaCompromisso?: string | null;
      iniciouEm?: string | null;
    };

    const data: Record<string, Date | null> = {};
    if (body.dataMissaCompromisso !== undefined)
      data.dataMissaCompromisso = body.dataMissaCompromisso ? new Date(body.dataMissaCompromisso) : null;
    if (body.iniciouEm !== undefined)
      data.iniciouEm = body.iniciouEm ? new Date(body.iniciouEm) : null;

    if (Object.keys(data).length === 0)
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });

    const formandos = await prisma.formando.findMany({
      where: { moradaId: id, organizacaoId: user.organizacaoId },
      select: { id: true },
    });

    await prisma.$transaction(
      formandos.map((f) =>
        prisma.progressoEtapa.upsert({
          where: { formandoId_nivelFormativo: { formandoId: f.id, nivelFormativo: morada.nivelFormativo } },
          update: data,
          create: { formandoId: f.id, nivelFormativo: morada.nivelFormativo, ...data },
        })
      )
    );

    logAction("morada_datas_etapa_updated", user.id, getClientIp(request), { id, nivelFormativo: morada.nivelFormativo }, user.organizacaoId);
    return NextResponse.json({ ok: true, formandosAtualizados: formandos.length });
  } catch (err) {
    logError("moradas/[id]/datas-etapa PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar datas da etapa" }, { status: 500 });
  }
}
