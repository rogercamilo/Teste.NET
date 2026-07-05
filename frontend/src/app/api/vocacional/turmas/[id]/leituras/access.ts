import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGestao } from "@/lib/auth-helpers";
import type { SessionUser } from "@/lib/auth-helpers";
import { requireVocacionalAccess } from "../../../guard";

interface TurmaLeituraAccess {
  user: SessionUser;
  organizacaoId: string;
  turmaId: string;
}

/**
 * Autoriza operações de leitura vocacional numa turma: exige acesso ao módulo
 * vocacional (org + papel mínimo FC) e que o usuário seja gestão OU o formador
 * responsável pela turma — espelha o gate de `vocacional/[id]/page.tsx`. A turma
 * precisa existir, ser `tipo:"vocacional"` e pertencer à organização.
 */
export async function requireTurmaLeituraAccess(
  turmaId: string
): Promise<{ error: NextResponse } | { access: TurmaLeituraAccess }> {
  const guard = await requireVocacionalAccess({ minPapel: "formador_comunitario" });
  if ("error" in guard) return guard;
  const { user, organizacaoId } = guard.access;

  const turma = await prisma.grupoFormacao.findFirst({
    where: { id: turmaId, organizacaoId, tipo: "vocacional" },
    select: { id: true, formadorId: true },
  });
  if (!turma) {
    return { error: NextResponse.json({ error: "Turma não encontrada" }, { status: 404 }) };
  }

  if (!isGestao(user.role) && turma.formadorId !== user.id) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }

  return { access: { user, organizacaoId, turmaId: turma.id } };
}
