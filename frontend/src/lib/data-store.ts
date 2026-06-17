/**
 * Client-side context layer.
 * Apenas hooks derivados do ComunidadeContext — sem fetch, sem cache.
 *
 * Toda a busca de dados agora é feita em Server Components via Prisma,
 * eliminando o flash/lag causado por useEffect fetches no cliente.
 */
import { useContext } from "react";
import { ComunidadeContext } from "@/components/layout/ComunidadeProvider";
import type { ComunidadeConfig, NivelFormativo } from "@/types";

// ---------------------------------------------------------------------------
// ComunidadeConfig — backed by /api/organizacao via shared ComunidadeContext
// ---------------------------------------------------------------------------
export function useComunidade(): [ComunidadeConfig, (c: ComunidadeConfig) => Promise<void>] {
  return useContext(ComunidadeContext);
}

// ---------------------------------------------------------------------------
// Termos helper
// ---------------------------------------------------------------------------
export interface Termos {
  grupoFormacao: string;
  formando: string;
  formador: string;
}

export function useTermos(): Termos {
  const [comunidade] = useComunidade();
  return {
    grupoFormacao: comunidade.termoGrupoFormacao?.trim() || "Grupo de Formação",
    formando: comunidade.termoFormando?.trim() || "Formando",
    formador: comunidade.termoFormador?.trim() || "Formador Comunitário",
  };
}

export function useEtapaLabels(): Record<NivelFormativo, string> {
  const [comunidade] = useComunidade();
  return {
    "pre-discipulado": comunidade.termoPreDiscipulado?.trim() || "Pré-Discipulado",
    "discipulado": comunidade.termoDiscipulado?.trim() || "Discipulado",
    "primeiras-promessas": comunidade.termoPrimeirasPromessas?.trim() || "Primeiras Promessas",
    "formacao-permanente": comunidade.termoFormacaoPermanente?.trim() || "Formação Permanente",
  };
}

