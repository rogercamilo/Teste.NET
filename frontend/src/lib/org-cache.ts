import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const ORG_BRANDING_TAG = "org-branding";

export const getOrgBranding = unstable_cache(
  async (organizacaoId: string) => {
    return prisma.organizacao.findUnique({
      where: { id: organizacaoId },
      select: {
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
      },
    });
  },
  [ORG_BRANDING_TAG],
  { revalidate: 30, tags: [ORG_BRANDING_TAG] },
);
