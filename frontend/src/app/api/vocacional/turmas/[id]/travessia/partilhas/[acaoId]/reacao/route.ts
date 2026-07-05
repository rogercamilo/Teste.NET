import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { ReacaoPartilhaSchema, parseJson } from "@/lib/schemas";
import { requireTurmaLeituraAccess } from "../../../../leituras/access";

type Params = { params: Promise<{ id: string; acaoId: string }> };

/**
 * Reação do formador a uma partilha do vocacionado (curtida + nota curta de
 * incentivo). Gate = `requireTurmaLeituraAccess` (gestão ou formador da turma).
 * Anti-IDOR: a partilha precisa ser tipo=partilha e pertencer a um livro DESTA
 * turma/organização — `acaoId` de outra turma não resolve → 404.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { id, acaoId } = await params;
  const guard = await requireTurmaLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { user, organizacaoId, turmaId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const parsed = await parseJson(request, ReacaoPartilhaSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const partilha = await prisma.acaoLeitura.findFirst({
      where: {
        id: acaoId,
        organizacaoId,
        tipo: "partilha",
        leitura: { turmaId, organizacaoId },
      },
      select: { id: true },
    });
    if (!partilha) {
      return NextResponse.json({ error: "Partilha não encontrada" }, { status: 404 });
    }

    const { curtiu, nota } = parsed.data;
    const data: {
      formadorReagiuEm: Date;
      formadorReagiuId: string | null;
      formadorCurtiu?: boolean;
      formadorNota?: string | null;
    } = {
      formadorReagiuEm: new Date(),
      formadorReagiuId: user.id ?? null,
    };
    if (curtiu !== undefined) data.formadorCurtiu = curtiu;
    if (nota !== undefined) data.formadorNota = nota?.trim() ? nota.trim() : null;

    const atualizada = await prisma.acaoLeitura.update({
      where: { id: partilha.id },
      data,
      select: { formadorCurtiu: true, formadorNota: true },
    });

    logAction("travessia_partilha_reacao", user.id, getClientIp(request), { turmaId, acaoId }, organizacaoId);
    return NextResponse.json({ ok: true, ...atualizada });
  } catch (err) {
    logError("vocacional travessia reacao PATCH", err);
    return NextResponse.json({ error: "Falha ao reagir à partilha" }, { status: 500 });
  }
}
