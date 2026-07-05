import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { MuralOptInSchema, parseJson } from "@/lib/schemas";

/**
 * Opt-in do vocacionado no Mural de Frutos da sua turma. Só é permitido quando o
 * formador ligou o Mural (`turma.muralFrutosAtivo`) — caso contrário, 403. Gate
 * anti-IDOR pela pertença: a participação tem de ser ATIVA e da turma atual do
 * formando (injetado pelo proxy via headers).
 */
const STATUS_VOCACIONAL_ATIVOS = ["ativa", "aguardando_carta", "em_discernimento"] as const;

export async function PATCH(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, MuralOptInSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
      select: { grupoFormacaoId: true, grupoFormacao: { select: { muralFrutosAtivo: true } } },
    });
    if (!formando?.grupoFormacaoId) {
      return NextResponse.json({ error: "Sem turma vinculada" }, { status: 404 });
    }
    if (!formando.grupoFormacao?.muralFrutosAtivo) {
      return NextResponse.json({ error: "Mural indisponível nesta turma" }, { status: 403 });
    }

    const participacao = await prisma.participacaoVocacional.findFirst({
      where: {
        formandoId,
        organizacaoId,
        turmaId: formando.grupoFormacaoId,
        status: { in: [...STATUS_VOCACIONAL_ATIVOS] },
      },
      select: { id: true },
    });
    if (!participacao) {
      return NextResponse.json({ error: "Participação não encontrada" }, { status: 404 });
    }

    await prisma.participacaoVocacional.update({
      where: { id: participacao.id },
      data: { muralOptIn: parsed.data.optIn },
    });

    logAction("travessia_mural_optin", undefined, getClientIp(request), { formandoId, optIn: parsed.data.optIn }, organizacaoId);
    return NextResponse.json({ ok: true, optIn: parsed.data.optIn });
  } catch (err) {
    logError("portal travessia mural PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar mural" }, { status: 500 });
  }
}
