/**
 * Tenant context — extrai organizacaoId da sessão NextAuth e fornece
 * helpers para garantir que todas as queries Prisma filtrem pelo tenant correto.
 *
 * Fase 2: single-tenant (DEFAULT_ORG_ID). Fase 3 adiciona multi-tenancy real.
 */

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth-helpers";

/** ID fixo da organização padrão (single-tenant).
 *  Deve coincidir com o ID criado no seed. */
export const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID ?? "org_default";

/** Retorna o organizacaoId da sessão atual, ou lança se não autenticado ou sem organização. */
export async function getOrganizacaoId(): Promise<string> {
  const session = await auth();
  if (!session?.user) throw new Error("Não autenticado");
  const orgId = (session.user as SessionUser).organizacaoId;
  if (!orgId) throw new Error("Sessão sem organização");
  return orgId;
}

/** Retorna o organizacaoId da sessão ou null se não autenticado / sem org.
 *  Falhas de infraestrutura (DB offline, token corrompido) são re-lançadas. */
export async function getOrganizacaoIdOptional(): Promise<string | null> {
  try {
    return await getOrganizacaoId();
  } catch (err) {
    if (err instanceof Error &&
        (err.message === "Não autenticado" || err.message === "Sessão sem organização")) {
      return null;
    }
    throw err;
  }
}

/** Busca a Organizacao pelo id, lança se não existir. */
export async function getOrganizacao(organizacaoId: string) {
  const org = await prisma.organizacao.findUnique({ where: { id: organizacaoId } });
  if (!org) throw new Error(`Organização não encontrada: ${organizacaoId}`);
  return org;
}

/** Garante que o organizacaoId do recurso bate com o do tenant atual.
 *  Lança se o recurso não tiver org (null = dado corrompido) ou pertencer a outro tenant.
 *  Use para validar acesso antes de retornar ou modificar um recurso. */
export function assertTenant(
  resourceOrgId: string | null,
  tenantOrgId: string
): void {
  if (resourceOrgId === null || resourceOrgId !== tenantOrgId) {
    throw new Error("Acesso negado: recurso pertence a outro tenant.");
  }
}
