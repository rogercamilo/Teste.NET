/**
 * localStorage-based persistence layer.
 * All entity data survives page navigation and browser refresh.
 * Document binaries (PDFs) stay in sessionStorage because of size limits.
 */
import React, { useState } from "react";
import type {
  PlanoFormativo,
  GradeFormativa,
  Morada,
  Formando,
  ComentarioFormando,
  PresencaFormacao,
} from "@/types";
import {
  mockPlanos,
  mockGrades,
  mockMoradas,
  mockFormandos,
  mockComentarios,
  mockPresencas,
} from "./mock-data";

// Bump this version whenever the entity schema changes to force a fresh load from mock data.
const SCHEMA_VERSION = "3";
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
  comentarios: {
    load: (): ComentarioFormando[] => read("comentarios", mockComentarios),
    save: (d: ComentarioFormando[]) => write("comentarios", d),
  },
  presencas: {
    load: (): PresencaFormacao[] => read("presencas", mockPresencas),
    save: (d: PresencaFormacao[]) => write("presencas", d),
  },
};

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

export function usePlanos(): [PlanoFormativo[], Setter<PlanoFormativo>] {
  const [s, ss] = useState<PlanoFormativo[]>(() => db.planos.load());
  return [s, makeSetter("planos", ss)];
}
export function useGrades(): [GradeFormativa[], Setter<GradeFormativa>] {
  const [s, ss] = useState<GradeFormativa[]>(() => db.grades.load());
  return [s, makeSetter("grades", ss)];
}
export function useMoradas(): [Morada[], Setter<Morada>] {
  const [s, ss] = useState<Morada[]>(() => db.moradas.load());
  return [s, makeSetter("moradas", ss)];
}
export function useFormandos(): [Formando[], Setter<Formando>] {
  const [s, ss] = useState<Formando[]>(() => db.formandos.load());
  return [s, makeSetter("formandos", ss)];
}
export function useComentarios(): [ComentarioFormando[], Setter<ComentarioFormando>] {
  const [s, ss] = useState<ComentarioFormando[]>(() => db.comentarios.load());
  return [s, makeSetter("comentarios", ss)];
}
export function usePresencas(): [PresencaFormacao[], Setter<PresencaFormacao>] {
  const [s, ss] = useState<PresencaFormacao[]>(() => db.presencas.load());
  return [s, makeSetter("presencas", ss)];
}
