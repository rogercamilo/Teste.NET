import { cache } from "react";
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
  logoUrl: true,
  termoGrupoFormacao: true,
  termoFormando: true,
  termoFormador: true,
  termoPreDiscipulado: true,
  termoDiscipulado: true,
  termoPrimeirasPromessas: true,
  termoFormacaoPermanente: true,
  vocacionalHabilitado: true,
  termoVocacional: true,
  termoAcompanhamentoVocacional: true,
  vocacionalDuracaoPadraoMeses: true,
  instagramHandle: true,
  youtubeUrl: true,
} as const;

// React.cache deduplicates calls within the same render (request-level memoization).
// unstable_cache persists the result across requests for 30 s (server-side data cache).
export const getOrgBranding = cache((organizacaoId: string) =>
  unstable_cache(
    () => prisma.organizacao.findUnique({ where: { id: organizacaoId }, select: brandingSelect }),
    [orgBrandingTag(organizacaoId)],
    { revalidate: 30, tags: [orgBrandingTag(organizacaoId)] }
  )()
);
