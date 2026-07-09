import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Nome atual do usuário lido direto do banco (fonte da verdade).
 *
 * O JWT do NextAuth guarda `session.user.name` do momento do LOGIN e não é
 * reconstruído quando `Usuario.nome` muda — nem numa edição do próprio perfil
 * nem quando um admin renomeia outro usuário. Por isso qualquer NOME exibido ao
 * usuário ou persistido como autoria/proveniência deve ser resolvido por aqui,
 * nunca por `session.user.name` (que fica defasado até o próximo login).
 *
 * `cache()` do React dedupa a consulta dentro do mesmo request — layout, página
 * e demais chamadas no mesmo render compartilham uma única query.
 */
export const getUserName = cache(
  async (userId: string | null | undefined): Promise<string | null> => {
    if (!userId) return null;
    try {
      const u = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { nome: true },
      });
      return u?.nome ?? null;
    } catch {
      // Resolver o nome é acessório — uma falha de leitura nunca deve derrubar a
      // ação em curso (upload, comentário). O chamador cai no fallback do JWT.
      return null;
    }
  },
);
