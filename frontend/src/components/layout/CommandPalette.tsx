"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap, Home, Library, Loader2, Plus, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { resolveNavGroups } from "./nav-items";
import { useComunidade, useTermos } from "@/lib/data-store";
import { hasVocacionalAccess } from "@/types";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string;
  grupoFormacaoId?: string | null;
}

type Hit = { id: string; label: string };
type SearchResults = {
  formandos: Hit[];
  grupos: Hit[];
  planos: Hit[];
  grades: Hit[];
  formacoes: Hit[];
};

const EMPTY: SearchResults = { formandos: [], grupos: [], planos: [], grades: [], formacoes: [] };

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function CommandPalette({ open, onOpenChange, role, grupoFormacaoId }: CommandPaletteProps) {
  const router = useRouter();
  const { grupoFormacao, formando } = useTermos();
  const [comunidade] = useComunidade();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  const isGestao = role === "formador_geral" || role === "administrador";
  const isSuperAdmin = role === "super_admin";

  // Navegação: fonte única com o sidebar (papel + termos + guards).
  const navItems = useMemo(() => {
    const tipoOrg = comunidade.tipoOrganizacao;
    const groups = resolveNavGroups({
      role,
      grupoFormacaoId,
      termoGrupoFormacao: grupoFormacao,
      termoFormando: formando,
      tipoOrg,
      vocacionalOk: hasVocacionalAccess(tipoOrg, comunidade.vocacionalHabilitado),
    });
    const seen = new Set<string>();
    return groups
      .flatMap((g) => g.items)
      .filter((item) => (seen.has(item.href) ? false : (seen.add(item.href), true)));
  }, [role, grupoFormacaoId, grupoFormacao, formando, comunidade.tipoOrganizacao, comunidade.vocacionalHabilitado]);

  const quickActions = useMemo(() => {
    if (!isGestao) return [];
    return [
      { title: `Nova ${grupoFormacao}`, href: "/grupos-formacao/nova" },
      { title: "Novo Plano Formativo", href: "/planos/novo" },
      { title: "Nova Grade Formativa", href: "/grades/novo" },
      { title: "Nova Formação", href: "/formacoes/novo" },
    ];
  }, [isGestao, grupoFormacao]);

  // Busca no servidor (debounced), escopada por org+papel na API. Todos os
  // setState ficam dentro do callback do timeout (fora do corpo do effect).
  useEffect(() => {
    const q = query.trim();
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      if (isSuperAdmin || q.length < 2) {
        setResults(EMPTY);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error("busca falhou");
        const data = (await res.json()) as { results: SearchResults };
        setResults(data.results ?? EMPTY);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, isSuperAdmin]);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) setQuery("");
      onOpenChange(o);
    },
    [onOpenChange],
  );

  const go = useCallback(
    (href: string) => {
      handleOpenChange(false);
      router.push(href);
    },
    [handleOpenChange, router],
  );

  const nq = norm(query);
  const filteredNav = nq ? navItems.filter((i) => norm(i.title).includes(nq)) : navItems;
  const filteredActions = nq ? quickActions.filter((a) => norm(a.title).includes(nq)) : quickActions;

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      shouldFilter={false}
      title="Busca rápida"
      description="Navegue e encontre registros por teclado"
    >
      <CommandInput
        autoFocus
        placeholder="Buscar páginas, formandos, grupos…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!loading && <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>}

        {filteredNav.length > 0 && (
          <CommandGroup heading="Navegação">
            {filteredNav.map((item) => (
              <CommandItem key={item.href} value={`nav:${item.href}`} onSelect={() => go(item.href)}>
                <item.icon />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {filteredActions.length > 0 && (
          <CommandGroup heading="Ações rápidas">
            {filteredActions.map((a) => (
              <CommandItem key={a.href} value={`action:${a.href}`} onSelect={() => go(a.href)}>
                <Plus />
                <span>{a.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.formandos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`${formando}s`}>
              {results.formandos.map((f) => (
                <CommandItem key={f.id} value={`formando:${f.id}`} onSelect={() => go(`/formandos/${f.id}`)}>
                  <Users />
                  <span>{f.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.grupos.length > 0 && (
          <CommandGroup heading={`${grupoFormacao}s`}>
            {results.grupos.map((g) => (
              <CommandItem key={g.id} value={`grupo:${g.id}`} onSelect={() => go(`/grupos-formacao/${g.id}`)}>
                <Home />
                <span>{g.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.planos.length > 0 && (
          <CommandGroup heading="Planos Formativos">
            {results.planos.map((p) => (
              <CommandItem key={p.id} value={`plano:${p.id}`} onSelect={() => go(`/planos/${p.id}`)}>
                <BookOpen />
                <span>{p.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.grades.length > 0 && (
          <CommandGroup heading="Grades Formativas">
            {results.grades.map((g) => (
              <CommandItem key={g.id} value={`grade:${g.id}`} onSelect={() => go(`/grades/${g.id}`)}>
                <Library />
                <span>{g.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.formacoes.length > 0 && (
          <CommandGroup heading="Formações">
            {results.formacoes.map((f) => (
              <CommandItem key={f.id} value={`formacao:${f.id}`} onSelect={() => go(`/formacoes/${f.id}`)}>
                <GraduationCap />
                <span>{f.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Buscando…
          </div>
        )}
      </CommandList>
    </CommandDialog>
  );
}
