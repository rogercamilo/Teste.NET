import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface PublicBranding {
  nome: string;
  nomePlataforma: string | null;
  logoUrl: string | null;
  temaCor: string;
}

const DEFAULT_BRANDING: PublicBranding = {
  nome: "Formatio",
  nomePlataforma: null,
  logoUrl: null,
  temaCor: "formatio",
};

// React.cache() deduplicates calls within a single request (layout + page share one DB hit)
export const getPublicBranding = cache(async (): Promise<PublicBranding> => {
  const orgId = process.env.DEFAULT_ORG_ID;
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
