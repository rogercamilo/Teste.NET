import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";
import { hasCanonicalAccess, temPermissao } from "@/types";

export interface LivroAccess {
  user: SessionUser;
  organizacaoId: string;
}

/**
 * Valida acesso ao Livro de Registro: autenticado + org com acesso canônico
 * (nova_comunidade / instituto_religioso) + papel mínimo.
 * Retorna { error: NextResponse } em caso de bloqueio, ou { access } se ok.
 */
export async function requireLivroAccess(opts: {
  minPapel: "formador_geral" | "administrador";
}): Promise<{ error: NextResponse } | { access: LivroAccess }> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }

  if (opts.minPapel === "administrador") {
    if (user.role !== "administrador") {
      return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
    }
  } else if (!temPermissao(user.role, "formador_geral")) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { tipoOrganizacao: true },
  });
  if (!hasCanonicalAccess(org?.tipoOrganizacao)) {
    return { error: NextResponse.json({ error: "Recurso indisponível para este tipo de organização" }, { status: 403 }) };
  }

  return { access: { user, organizacaoId: user.organizacaoId } };
}
