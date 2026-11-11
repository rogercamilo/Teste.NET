import "server-only";
import { prisma } from "@/lib/prisma";
import { NIVEL_FORMATIVO_LABELS, type NivelFormativo } from "@/types";
import { resolveDocumentoBranding, type DocumentoBranding } from "@/lib/documentos-eclesiasticos/branding";

export interface PdfContexto {
  orgNome: string;
  branding: DocumentoBranding;
  etapaLabel: (n: NivelFormativo) => string;
}

/** Contexto comum dos PDFs de relatório: nome/branding da org + rótulo de etapa por tenant. */
export async function carregarContextoPdf(organizacaoId: string): Promise<PdfContexto> {
  const org = await prisma.organizacao.findUnique({
    where: { id: organizacaoId },
    select: {
      nome: true, temaCor: true, logoUrl: true,
      termoPreDiscipulado: true, termoDiscipulado: true,
      termoPrimeirasPromessas: true, termoFormacaoPermanente: true,
    },
  });
  const labelMap: Partial<Record<NivelFormativo, string>> = {
    "pre-discipulado": org?.termoPreDiscipulado || undefined,
    discipulado: org?.termoDiscipulado || undefined,
    "primeiras-promessas": org?.termoPrimeirasPromessas || undefined,
    "formacao-permanente": org?.termoFormacaoPermanente || undefined,
  };
  return {
    orgNome: org?.nome ?? "Organização",
    branding: resolveDocumentoBranding(org),
    etapaLabel: (n) => labelMap[n] || NIVEL_FORMATIVO_LABELS[n] || n,
  };
}

const hoje = () => new Date();
export const dataLongaPtBr = () => hoje().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
export const dataCurtaPtBr = () => hoje().toLocaleDateString("pt-BR");
export const dataLongaDe = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
