"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
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

export function ComunidadeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ComunidadeConfig>(DEFAULT_COMUNIDADE);

  useEffect(() => {
    fetch("/api/organizacao")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ComunidadeConfig | null) => {
        if (data) setState({ ...DEFAULT_COMUNIDADE, ...data });
      })
      .catch(() => {});
  }, []);

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
