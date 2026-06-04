/**
 * API-backed persistence layer.
 * Hooks load from the REST API on mount and sync writes back via CRUD endpoints.
 * The `db` object provides a synchronous in-memory cache for non-reactive reads;
 * it is populated when hooks load. Fonte de verdade exclusiva: API/PostgreSQL.
 *
 * D2.6: localStorage removido completamente.
 * D2.7: mock-data removido como fallback — arrays vazios evitam dados fantasma.
 */
import { useState, useEffect, useRef, useContext } from "react";
import { ComunidadeContext } from "@/components/layout/ComunidadeProvider";
import type {
  Agendamento,
  EventoFormando,
  Formacao,
  PlanoFormativo,
  GradeFormativa,
  HistoricoFormando,
  GrupoFormacao,
  Formando,
  ComentarioFormando,
  PresencaFormacao,
  Usuario,
  ComunidadeConfig,
  NivelFormativo,
} from "@/types";

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
  agendamentos: makeDbEntity<Agendamento>("agendamentos", []),
  formacoes: makeDbEntity<Formacao>("formacoes", []),
  planos: makeDbEntity<PlanoFormativo>("planos", []),
  grades: makeDbEntity<GradeFormativa>("grades", []),
  gruposFormacao: makeDbEntity<GrupoFormacao>("gruposFormacao", []),
  formandos: makeDbEntity<Formando>("formandos", []),
  historico: makeDbEntity<HistoricoFormando>("historico", []),
  comentarios: makeDbEntity<ComentarioFormando>("comentarios", []),
  presencas: makeDbEntity<PresencaFormacao>("presencas", []),
  usuarios: makeDbEntity<Usuario>("usuarios", []),
  eventosFormando: makeDbEntity<EventoFormando>("eventosFormando", []),
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
type Setter<T> = (updater: T[] | ((prev: T[]) => T[])) => Promise<void>;

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

  const setter: Setter<T> = async (updater) => {
    const prev = prevRef.current;
    const next = typeof updater === "function" ? updater(prev) : updater;

    // Optimistic update
    setItems(next);
    prevRef.current = next;
    dbEntity.save(next);

    // Await API sync so callers can navigate only after persistence is confirmed
    const fresh = await syncToApi(endpoint, prev, next).catch(() => null);
    if (fresh) {
      setItems(fresh);
      prevRef.current = fresh;
      dbEntity.save(fresh);
    }
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
export function useGruposFormacao(): [GrupoFormacao[], Setter<GrupoFormacao>] {
  return useApiEntity("gruposFormacao", db.gruposFormacao);
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
    return Promise.resolve();
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
// ComunidadeConfig — backed by /api/organizacao via shared ComunidadeContext
// ---------------------------------------------------------------------------
export function useComunidade(): [ComunidadeConfig, (c: ComunidadeConfig) => void] {
  return useContext(ComunidadeContext);
}

// ---------------------------------------------------------------------------
// Termos helper (unchanged)
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
