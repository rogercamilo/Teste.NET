/**
 * API-backed persistence layer.
 * Hooks load from the REST API on mount and sync writes back via CRUD endpoints.
 * The `db` object provides a synchronous in-memory cache for non-reactive reads
 * (e.g. `db.moradas.load()` in useState initialisers); it is populated when hooks load.
 *
 * D2.6: localStorage removido completamente. Fonte de verdade é a API/PostgreSQL.
 * Fallback de desenvolvimento: mock-data (apenas enquanto a API não responde).
 */
import { useState, useEffect, useRef } from "react";
import type {
  Agendamento,
  EventoFormando,
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
  NivelFormativo,
} from "@/types";
import {
  mockAgendamentos,
  mockEventosFormando,
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

// ---------------------------------------------------------------------------
// In-memory cache — shared between hooks and db object
// ---------------------------------------------------------------------------
const mem: Record<string, unknown[]> = {};

// ---------------------------------------------------------------------------
// db — interface síncrona (lê do cache em memória, fallback para mock-data)
// ---------------------------------------------------------------------------
function makeDbEntity<T>(entity: string, fallback: T[]) {
  return {
    load: (): T[] => (mem[entity] as T[] | undefined) ?? fallback,
    save: (d: T[]): void => { mem[entity] = d; },
  };
}

export const db = {
  agendamentos: makeDbEntity<Agendamento>("agendamentos", mockAgendamentos),
  formacoes: makeDbEntity<Formacao>("formacoes", mockFormacoes),
  planos: makeDbEntity<PlanoFormativo>("planos", mockPlanos),
  grades: makeDbEntity<GradeFormativa>("grades", mockGrades),
  moradas: makeDbEntity<Morada>("moradas", mockMoradas),
  formandos: makeDbEntity<Formando>("formandos", mockFormandos),
  historico: makeDbEntity<HistoricoFormando>("historico", mockHistorico),
  comentarios: makeDbEntity<ComentarioFormando>("comentarios", mockComentarios),
  presencas: makeDbEntity<PresencaFormacao>("presencas", mockPresencas),
  usuarios: makeDbEntity<Usuario>("usuarios", mockUsuarios),
  eventosFormando: makeDbEntity<EventoFormando>("eventosFormando", mockEventosFormando),
};

// ---------------------------------------------------------------------------
// API sync — detects creates / updates / deletes and calls the right endpoints
// ---------------------------------------------------------------------------
const JSON_HEADERS = { "Content-Type": "application/json" };

async function syncToApi<T extends { id: string }>(
  endpoint: string,
  prev: T[],
  next: T[],
): Promise<T[] | null> {
  const prevMap = new Map(prev.map((i) => [i.id, i]));
  const nextMap = new Map(next.map((i) => [i.id, i]));

  try {
    // Deletes
    for (const [id] of prevMap) {
      if (!nextMap.has(id)) {
        await fetch(`/api/${endpoint}/${id}`, { method: "DELETE" });
      }
    }
    // Creates
    for (const [, item] of nextMap) {
      if (!prevMap.has(item.id)) {
        await fetch(`/api/${endpoint}`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(item),
        });
      }
    }
    // Updates
    for (const [id, item] of nextMap) {
      if (prevMap.has(id)) {
        const prev = prevMap.get(id)!;
        if (JSON.stringify(prev) !== JSON.stringify(item)) {
          await fetch(`/api/${endpoint}/${id}`, {
            method: "PUT",
            headers: JSON_HEADERS,
            body: JSON.stringify(item),
          });
        }
      }
    }
    // Refresh from server (canonicalises IDs)
    const res = await fetch(`/api/${endpoint}`);
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generic API-backed hook
// ---------------------------------------------------------------------------
type Setter<T> = (updater: T[] | ((prev: T[]) => T[])) => void;

function useApiEntity<T extends { id: string }>(
  endpoint: string,
  dbEntity: { load: () => T[]; save: (d: T[]) => void },
): [T[], Setter<T>] {
  const [items, setItems] = useState<T[]>(() => dbEntity.load());
  const prevRef = useRef<T[]>(items);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/${endpoint}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: T[] | null) => {
        if (!cancelled && data) {
          setItems(data);
          prevRef.current = data;
          dbEntity.save(data);
        }
      })
      .catch(() => {/* not authenticated yet or network error — keep cache */});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const setter: Setter<T> = (updater) => {
    const prev = prevRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;

    // Optimistic update
    setItems(next);
    prevRef.current = next;
    dbEntity.save(next);

    // Background API sync + server refresh
    syncToApi(endpoint, prev, next)
      .then((fresh) => {
        if (fresh) {
          setItems(fresh);
          prevRef.current = fresh;
          dbEntity.save(fresh);
        }
      })
      .catch(() => {/* keep optimistic state */});
  };

  return [items, setter];
}

// ---------------------------------------------------------------------------
// Exported hooks (same interface as before)
// ---------------------------------------------------------------------------
export function useAgendamentos(): [Agendamento[], Setter<Agendamento>] {
  return useApiEntity("agendamentos", db.agendamentos);
}
export function useFormacoes(): [Formacao[], Setter<Formacao>] {
  return useApiEntity("formacoes", db.formacoes);
}
export function usePlanos(): [PlanoFormativo[], Setter<PlanoFormativo>] {
  return useApiEntity("planos", db.planos);
}
export function useGrades(): [GradeFormativa[], Setter<GradeFormativa>] {
  return useApiEntity("grades", db.grades);
}
export function useMoradas(): [Morada[], Setter<Morada>] {
  return useApiEntity("moradas", db.moradas);
}
export function useFormandos(): [Formando[], Setter<Formando>] {
  return useApiEntity("formandos", db.formandos);
}
export function useHistorico(): [HistoricoFormando[], Setter<HistoricoFormando>] {
  // HistoricoFormando é derivado das presenças — sem endpoint próprio; usa cache em memória.
  const [s, ss] = useState<HistoricoFormando[]>(() => db.historico.load());
  const setter: Setter<HistoricoFormando> = (updater) => {
    ss((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      db.historico.save(next);
      return next;
    });
  };
  return [s, setter];
}
export function useComentarios(): [ComentarioFormando[], Setter<ComentarioFormando>] {
  return useApiEntity("comentarios", db.comentarios);
}
export function usePresencas(): [PresencaFormacao[], Setter<PresencaFormacao>] {
  return useApiEntity("presencas", db.presencas);
}
export function useUsuarios(): [Usuario[], Setter<Usuario>] {
  return useApiEntity("users", db.usuarios);
}
export function useEventosFormando(): [EventoFormando[], Setter<EventoFormando>] {
  return useApiEntity("eventos", db.eventosFormando);
}

// ---------------------------------------------------------------------------
// ComunidadeConfig — backed by /api/organizacao
// ---------------------------------------------------------------------------
const DEFAULT_COMUNIDADE: ComunidadeConfig = {
  nome: "",
  descricao: "",
  endereco: "",
  missao: "",
  anoFundacao: "",
};

export function useComunidade(): [ComunidadeConfig, (c: ComunidadeConfig) => void] {
  const [s, ss] = useState<ComunidadeConfig>(DEFAULT_COMUNIDADE);

  useEffect(() => {
    fetch("/api/organizacao")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ComunidadeConfig | null) => { if (data) ss({ ...DEFAULT_COMUNIDADE, ...data }); })
      .catch(() => {});
  }, []);

  const save = (c: ComunidadeConfig) => {
    ss(c);
    fetch("/api/organizacao", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(c),
    }).catch(() => {});
  };

  return [s, save];
}

// ---------------------------------------------------------------------------
// Termos helper (unchanged)
// ---------------------------------------------------------------------------
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

export function useEtapaLabels(): Record<NivelFormativo, string> {
  const [comunidade] = useComunidade();
  return {
    "pre-discipulado": comunidade.termoPreDiscipulado?.trim() || "Pré-Discipulado",
    "discipulado": comunidade.termoDiscipulado?.trim() || "Discipulado",
    "primeiras-promessas": comunidade.termoPrimeirasPromessas?.trim() || "Primeiras Promessas",
    "formacao-permanente": comunidade.termoFormacaoPermanente?.trim() || "Formação Permanente",
  };
}
