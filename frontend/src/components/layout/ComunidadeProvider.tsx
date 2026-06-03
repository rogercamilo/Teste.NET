"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ComunidadeConfig } from "@/types";

const DEFAULT_COMUNIDADE: ComunidadeConfig = {
  nome: "",
  descricao: "",
  endereco: "",
  missao: "",
  anoFundacao: "",
};

const JSON_HEADERS = { "Content-Type": "application/json" };

type ComunidadeCtx = [ComunidadeConfig, (c: ComunidadeConfig) => void];

export const ComunidadeContext = createContext<ComunidadeCtx>([DEFAULT_COMUNIDADE, () => {}]);

// initialData comes from the Server Component layout — eliminates the client-side
// fetch on mount that was causing a flash of default terminology on every page.
export function ComunidadeProvider({
  children,
  initialData,
}: {
  children: ReactNode;
  initialData?: Partial<ComunidadeConfig>;
}) {
  const [state, setState] = useState<ComunidadeConfig>({
    ...DEFAULT_COMUNIDADE,
    ...initialData,
  });

  const save = (c: ComunidadeConfig) => {
    setState(c);
    fetch("/api/organizacao", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(c),
    }).catch(() => {});
  };

  return (
    <ComunidadeContext.Provider value={[state, save]}>
      {children}
    </ComunidadeContext.Provider>
  );
}

export function useComunidadeContext(): ComunidadeCtx {
  return useContext(ComunidadeContext);
}
