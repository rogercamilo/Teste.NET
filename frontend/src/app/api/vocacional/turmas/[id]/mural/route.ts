import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { MuralTurmaSchema, parseJson } from "@/lib/schemas";
import { requireTurmaLeituraAccess } from "../leituras/access";

type Params = { params: Promise<{ id: string }> };

/**
 * Liga/desliga o Mural de Frutos da turma. Gate = `requireTurmaLeituraAccess`
 * (gestão ou formador responsável pela turma). Desligar não apaga os opt-in dos
 * vocacionados — só oculta o Mural; religar restaura o estado anterior.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireTurmaLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { user, organizacaoId, turmaId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const parsed = await parseJson(request, MuralTurmaSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    await prisma.grupoFormacao.update({
      where: { id: turmaId },
      data: { muralFrutosAtivo: parsed.data.ativo },
    });

    logAction("travessia_mural_turma", user.id, getClientIp(request), { turmaId, ativo: parsed.data.ativo }, organizacaoId);
    return NextResponse.json({ ok: true, ativo: parsed.data.ativo });
  } catch (err) {
    logError("vocacional turma mural PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar mural" }, { status: 500 });
  }
}
