import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isGestao, type SessionUser } from "@/lib/auth-helpers";
import { temPermissao } from "@/types";

interface GrupoLeituraAccess {
  user: SessionUser;
  organizacaoId: string;
  turmaId: string;
}

/**
 * Autoriza operações de leitura num GRUPO DE FORMAÇÃO (jornada por níveis). A
 * leitura vive no grupo (`LeituraVocacional.turmaId === GrupoFormacao.id`) — o
 * mesmo motor da Travessia vocacional, sem exigir o módulo vocacional. Exige
 * autenticado + papel mínimo FC + (gestão OU formador responsável pelo grupo,
 * seja pelo `formadorId` do grupo, seja pelo vínculo `usuario.grupoFormacaoId`).
 * O grupo precisa existir na organização; qualquer `tipo` é aceito.
 */
export async function requireGrupoLeituraAccess(
  grupoId: string
): Promise<{ error: NextResponse } | { access: GrupoLeituraAccess }> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  if (!temPermissao(user.role, "formador_comunitario")) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }

  const grupo = await prisma.grupoFormacao.findFirst({
    where: { id: grupoId, organizacaoId: user.organizacaoId },
    select: { id: true, formadorId: true },
  });
  if (!grupo) {
    return { error: NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 }) };
  }

  const ehFormadorDoGrupo = grupo.formadorId === user.id || user.grupoFormacaoId === grupo.id;
  if (!isGestao(user.role) && !ehFormadorDoGrupo) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }

  return { access: { user, organizacaoId: user.organizacaoId, turmaId: grupo.id } };
}
