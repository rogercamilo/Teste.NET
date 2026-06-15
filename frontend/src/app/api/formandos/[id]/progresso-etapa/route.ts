import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isGestao, SessionUser as SU } from "@/lib/auth-helpers";
import { isValidId, UpdateProgressoEtapaSchema, parseBody } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const isFC = user.role === "formador_comunitario";
  if (!isGestao(user.role) && !isFC) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const parsed = parseBody(UpdateProgressoEtapaSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    // Valida que o formando pertence à organização (e à morada do FC, se aplicável)
    const formando = await prisma.formando.findFirst({
      where: { id, organizacaoId: user.organizacaoId, deletedAt: null },
      select: { id: true, grupoFormacaoId: true },
    });
    if (!formando) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    if (isFC && formando.grupoFormacaoId !== (user.grupoFormacaoId ?? null)) {
      return NextResponse.json({ error: "Sem permissão para editar este formando" }, { status: 403 });
    }

    const updated = await prisma.progressoEtapa.update({
      where: { formandoId_nivelFormativo: { formandoId: id, nivelFormativo: body.nivelFormativo } },
      data: {
        ...(body.dataMissaCompromisso !== undefined && {
          dataMissaCompromisso: body.dataMissaCompromisso ? new Date(body.dataMissaCompromisso) : null,
        }),
        ...(body.iniciouEm !== undefined && {
          iniciouEm: body.iniciouEm ? new Date(body.iniciouEm) : null,
        }),
        ...(body.concluiuEm !== undefined && {
          concluiuEm: body.concluiuEm ? new Date(body.concluiuEm) : null,
        }),
      },
    });

    logAction("progresso_etapa_updated", user.id, getClientIp(request), { formandoId: id, nivelFormativo: body.nivelFormativo }, user.organizacaoId);
    return NextResponse.json({
      nivelFormativo: updated.nivelFormativo,
      iniciouEm: updated.iniciouEm?.toISOString().split("T")[0] ?? null,
      concluiuEm: updated.concluiuEm?.toISOString().split("T")[0] ?? null,
      dataMissaCompromisso: updated.dataMissaCompromisso?.toISOString().split("T")[0] ?? null,
    });
  } catch (err) {
    logError("formandos/[id]/progresso-etapa PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar datas da etapa" }, { status: 500 });
  }
}
