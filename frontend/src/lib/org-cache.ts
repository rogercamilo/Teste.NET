import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Retorna a tag de cache para o branding de uma org específica. */
export const orgBrandingTag = (orgId: string) => `org-branding-${orgId}`;

const brandingSelect = {
  onboardingConcluido: true,
  temaCor: true,
  nomePlataforma: true,
  nome: true,
  tipoOrganizacao: true,
  descricao: true,
  endereco: true,
  missao: true,
  anoFundacao: true,
  termoGrupoFormacao: true,
  termoFormando: true,
  termoFormador: true,
  termoPreDiscipulado: true,
  termoDiscipulado: true,
  termoPrimeirasPromessas: true,
  termoFormacaoPermanente: true,
} as const;

export async function getOrgBranding(organizacaoId: string) {
  return unstable_cache(
    () => prisma.organizacao.findUnique({ where: { id: organizacaoId }, select: brandingSelect }),
    [orgBrandingTag(organizacaoId)],
    { revalidate: 30, tags: [orgBrandingTag(organizacaoId)] }
  )();
}
