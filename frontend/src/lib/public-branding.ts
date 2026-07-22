import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface PublicBranding {
  nome: string;
  nomePlataforma: string | null;
  logoUrl: string | null;
  temaCor: string;
}

// Identidade NEUTRA da plataforma (sem tenant). É o que superfícies anônimas exibem
// quando a org não pode ser resolvida — inclusive o 1º passo do login (antes do e-mail).
export const NEUTRAL_BRANDING: PublicBranding = {
  nome: "Formattio",
  nomePlataforma: null,
  logoUrl: null,
  temaCor: "Formattio",
};

const DEFAULT_BRANDING = NEUTRAL_BRANDING;

// React.cache() deduplicates calls within a single request (layout + page share one DB hit
// desde que passem o MESMO organizacaoId).
//
// `organizacaoId` deve ser passado sempre que a org for conhecida (portal autenticado, tokens
// de ativação/reset). Superfícies anônimas — login da equipe, landing do portal — não têm como
// resolver o tenant (não há roteamento por host/subdomínio), então caem no DEFAULT_ORG_ID.
export const getPublicBranding = cache(async (organizacaoId?: string): Promise<PublicBranding> => {
  const orgId = organizacaoId ?? process.env.DEFAULT_ORG_ID;
  if (!orgId) return DEFAULT_BRANDING;
  try {
    const org = await prisma.organizacao.findUnique({
      where: { id: orgId },
      select: { nome: true, nomePlataforma: true, logoUrl: true, temaCor: true },
    });
    if (!org) return DEFAULT_BRANDING;
    return {
      nome: org.nome,
      nomePlataforma: org.nomePlataforma ?? null,
      logoUrl: org.logoUrl ?? null,
      temaCor: org.temaCor,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
});
