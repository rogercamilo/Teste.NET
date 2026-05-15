/**
 * localStorage-based persistence layer.
 * All entity data survives page navigation and browser refresh.
 * Document binaries (PDFs) are stored in localStorage under the key `doc_<id>`.
 */
import React, { useState, useEffect } from "react";
import type {
  Agendamento,
  Formacao,
  PlanoFormativo,
  GradeFormativa,
  HistoricoFormando,
  Morada,
  Formando,
  ComentarioFormando,
  PresencaFormacao,
  Usuario,
  ComunidadeConfig,
} from "@/types";
import {
  mockAgendamentos,
  mockFormacoes,
  mockPlanos,
  mockGrades,
  mockHistorico,
  mockMoradas,
  mockFormandos,
  mockComentarios,
  mockPresencas,
  mockUsuarios,
} from "./mock-data";

const DEFAULT_COMUNIDADE: ComunidadeConfig = {
  nome: "Comunidade Missionária Dom Bosco",
  descricao: "Comunidade de vida consagrada dedicada à formação cristã integral.",
  endereco: "Fortaleza, Ceará — Brasil",
  missao: "Evangelizar e formar discípulos de Cristo segundo o espírito salesiano de Dom Bosco.",
  anoFundacao: "2000",
};

// Bump this version whenever the entity schema changes to force a fresh load from mock data.
const SCHEMA_VERSION = "4";
const VERSION_KEY = "appForm:_version";

const KEY = (entity: string) => `appForm:${entity}`;

function ensureFreshSchema() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(VERSION_KEY) !== SCHEMA_VERSION) {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("appForm:") && k !== VERSION_KEY)
      .forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(VERSION_KEY, SCHEMA_VERSION);
  }
}

function read<T>(entity: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  ensureFreshSchema();
  try {
    const raw = localStorage.getItem(KEY(entity));
    if (!raw) return fallback;
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

function write<T>(entity: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY(entity), JSON.stringify(data));
  } catch {
    // quota exceeded — silently skip
  }
}

// Direct access (for non-reactive reads, e.g. initialising derived data)
export const db = {
  agendamentos: {
    load: (): Agendamento[] => read("agendamentos", mockAgendamentos),
    save: (d: Agendamento[]) => write("agendamentos", d),
  },
  formacoes: {
    load: (): Formacao[] => read("formacoes", mockFormacoes),
    save: (d: Formacao[]) => write("formacoes", d),
  },
  planos: {
    load: (): PlanoFormativo[] => read("planos", mockPlanos),
    save: (d: PlanoFormativo[]) => write("planos", d),
  },
  grades: {
    load: (): GradeFormativa[] => read("grades", mockGrades),
    save: (d: GradeFormativa[]) => write("grades", d),
  },
  moradas: {
    load: (): Morada[] => read("moradas", mockMoradas),
    save: (d: Morada[]) => write("moradas", d),
  },
  formandos: {
    load: (): Formando[] => read("formandos", mockFormandos),
    save: (d: Formando[]) => write("formandos", d),
  },
  historico: {
    load: (): HistoricoFormando[] => read("historico", mockHistorico),
    save: (d: HistoricoFormando[]) => write("historico", d),
  },
  comentarios: {
    load: (): ComentarioFormando[] => read("comentarios", mockComentarios),
    save: (d: ComentarioFormando[]) => write("comentarios", d),
  },
  presencas: {
    load: (): PresencaFormacao[] => read("presencas", mockPresencas),
    save: (d: PresencaFormacao[]) => write("presencas", d),
  },
  usuarios: {
    load: (): Usuario[] => read("usuarios", mockUsuarios),
    save: (d: Usuario[]) => write("usuarios", d),
  },
};

function loadComunidade(): ComunidadeConfig {
  if (typeof window === "undefined") return DEFAULT_COMUNIDADE;
  ensureFreshSchema();
  try {
    const raw = localStorage.getItem("appForm:comunidade");
    if (!raw) return DEFAULT_COMUNIDADE;
    return { ...DEFAULT_COMUNIDADE, ...JSON.parse(raw) } as ComunidadeConfig;
  } catch {
    return DEFAULT_COMUNIDADE;
  }
}

function saveComunidade(d: ComunidadeConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("appForm:comunidade", JSON.stringify(d));
  } catch {
    // quota exceeded — silently skip
  }
}

type Setter<T> = (updater: T[] | ((prev: T[]) => T[])) => void;

function makeSetter<T>(entity: keyof typeof db, setState: React.Dispatch<React.SetStateAction<T[]>>): Setter<T> {
  return (updater) => {
    setState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      (db[entity] as { save: (d: T[]) => void }).save(next);
      return next;
    });
  };
}

function usePersistedEntity<T>(
  entity: keyof typeof db,
  mockFallback: T[]
): [T[], Setter<T>] {
  // Start with mock data so server and client initial renders match (no hydration mismatch).
  // useEffect then replaces with the actual localStorage data after hydration.
  const [s, ss] = useState<T[]>(mockFallback);
  useEffect(() => {
    ss((db[entity] as unknown as { load: () => T[] }).load());
  }, [entity]);
  return [s, makeSetter(entity, ss)];
}

export function useAgendamentos(): [Agendamento[], Setter<Agendamento>] {
  return usePersistedEntity("agendamentos", mockAgendamentos);
}
export function useFormacoes(): [Formacao[], Setter<Formacao>] {
  return usePersistedEntity("formacoes", mockFormacoes);
}
export function usePlanos(): [PlanoFormativo[], Setter<PlanoFormativo>] {
  return usePersistedEntity("planos", mockPlanos);
}
export function useGrades(): [GradeFormativa[], Setter<GradeFormativa>] {
  return usePersistedEntity("grades", mockGrades);
}
export function useMoradas(): [Morada[], Setter<Morada>] {
  return usePersistedEntity("moradas", mockMoradas);
}
export function useFormandos(): [Formando[], Setter<Formando>] {
  return usePersistedEntity("formandos", mockFormandos);
}
export function useHistorico(): [HistoricoFormando[], Setter<HistoricoFormando>] {
  return usePersistedEntity("historico", mockHistorico);
}
export function useComentarios(): [ComentarioFormando[], Setter<ComentarioFormando>] {
  return usePersistedEntity("comentarios", mockComentarios);
}
export function usePresencas(): [PresencaFormacao[], Setter<PresencaFormacao>] {
  return usePersistedEntity("presencas", mockPresencas);
}
export function useUsuarios(): [Usuario[], Setter<Usuario>] {
  return usePersistedEntity("usuarios", mockUsuarios);
}
export function useComunidade(): [ComunidadeConfig, (c: ComunidadeConfig) => void] {
  const [s, ss] = useState<ComunidadeConfig>(() => loadComunidade());
  return [s, (c) => { saveComunidade(c); ss(c); }];
}

export interface Termos {
  morada: string;
  formando: string;
  formador: string;
}

export function useTermos(): Termos {
  const [comunidade] = useComunidade();
  return {
    morada: comunidade.termoMorada?.trim() || "Morada",
    formando: comunidade.termoFormando?.trim() || "Formando",
    formador: comunidade.termoFormador?.trim() || "Formador Comunitário",
  };
}
