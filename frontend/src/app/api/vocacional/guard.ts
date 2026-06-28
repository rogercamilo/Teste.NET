import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasVocacionalAccess, temPermissao, type PerfilUsuario } from "@/types";

export interface VocacionalAccess {
  user: SessionUser;
  organizacaoId: string;
}

/**
 * Valida acesso ao módulo Período Vocacional: autenticado + org com o módulo
 * disponível (tipo canônico OU `vocacionalHabilitado`) + papel mínimo.
 * Retorna { error: NextResponse } em caso de bloqueio, ou { access } se ok.
 */
export async function requireVocacionalAccess(opts: {
  minPapel: PerfilUsuario;
}): Promise<{ error: NextResponse } | { access: VocacionalAccess }> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }

  if (!temPermissao(user.role, opts.minPapel)) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { tipoOrganizacao: true, vocacionalHabilitado: true },
  });
  if (!hasVocacionalAccess(org?.tipoOrganizacao, org?.vocacionalHabilitado)) {
    return { error: NextResponse.json({ error: "Módulo Período Vocacional indisponível para esta organização" }, { status: 403 }) };
  }

  return { access: { user, organizacaoId: user.organizacaoId } };
}
