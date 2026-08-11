"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { NIVEL_FORMATIVO_LABELS, type Formacao } from "@/types";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const SEM_EIXO = "__sem_eixo__";

/** Remove acentos e caixa para busca tolerante a diacríticos. */
const norm = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Filtro do cmdk: casa por TODOS os termos digitados (AND) contra as
 * palavras-chave do item (tema, eixo, nível, código, número), ignorando
 * acentos. `value` do item é o id — não entra na busca de propósito.
 */
function matchFormacao(_value: string, search: string, keywords?: string[]) {
  const hay = norm((keywords ?? []).join(" "));
  const termos = norm(search).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return 1;
  return termos.every((t) => hay.includes(t)) ? 1 : 0;
}

interface FormacaoComboboxProps {
  formacoes: Formacao[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
  placeholder?: string;
}

export function FormacaoCombobox({
  formacoes,
  value,
  onChange,
  id,
  placeholder = "Buscar formação pelo nome…",
}: FormacaoComboboxProps) {
  const [open, setOpen] = useState(false);

  const selecionada = useMemo(
    () => formacoes.find((f) => f.id === value),
    [formacoes, value]
  );

  // Agrupa por eixo do caminho formativo; formações avulsas (sem eixo) por último.
  const grupos = useMemo(() => {
    const mapa = new Map<string, { chave: string; nome: string; items: Formacao[] }>();
    for (const f of formacoes) {
      const chave = f.eixoNome ?? SEM_EIXO;
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          chave,
          nome: f.eixoNome ?? "Formações avulsas",
          items: [],
        });
      }
      mapa.get(chave)!.items.push(f);
    }
    const lista = [...mapa.values()];
    lista.sort((a, b) => {
      if (a.chave === SEM_EIXO) return 1;
      if (b.chave === SEM_EIXO) return -1;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    for (const g of lista) {
      g.items.sort(
        (a, b) =>
          (a.numero ?? Number.MAX_SAFE_INTEGER) - (b.numero ?? Number.MAX_SAFE_INTEGER) ||
          a.tema.localeCompare(b.tema, "pt-BR")
      );
    }
    return lista;
  }, [formacoes]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        aria-expanded={open}
        aria-label={selecionada ? `Formação: ${selecionada.tema}` : "Selecionar formação"}
        className={cn(
          "flex h-auto min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-left text-sm transition-colors outline-none",
          "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "dark:bg-input/30 dark:hover:bg-input/50"
        )}
      >
        {selecionada ? (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-foreground">{selecionada.tema}</span>
            {selecionada.eixoNome && (
              <span className="truncate text-xs text-muted-foreground">{selecionada.eixoNome}</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">Selecionar formação…</span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-(--anchor-width) min-w-[16rem] p-0"
      >
        <Command filter={matchFormacao}>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Nenhuma formação encontrada.</CommandEmpty>
            {grupos.map((grupo) => (
              <CommandGroup key={grupo.chave} heading={grupo.nome}>
                {grupo.items.map((f) => {
                  const ativo = f.id === value;
                  return (
                    <CommandItem
                      key={f.id}
                      value={f.id}
                      keywords={[
                        f.tema,
                        f.eixoNome ?? "",
                        NIVEL_FORMATIVO_LABELS[f.nivelFormativo] ?? "",
                        f.codigo ?? "",
                        f.numero != null ? String(f.numero) : "",
                      ]}
                      onSelect={() => {
                        onChange(f.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4 shrink-0 text-primary",
                          ativo ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-foreground">
                          {f.numero != null && (
                            <span className="mr-1.5 text-xs font-medium text-muted-foreground">
                              {f.numero}.
                            </span>
                          )}
                          {f.tema}
                        </span>
                      </span>
                      <span className="ml-2 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {NIVEL_FORMATIVO_LABELS[f.nivelFormativo]}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
