"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sprout, Flag, Loader2, MessageSquareText, Heart, Pencil, Trash2, X } from "lucide-react";
import { MARCOS_TRAVESSIA, FRUTOS_POR_ACAO } from "@/types";
import type { PortalTravessia, TravessiaLivro, TravessiaPartilha } from "@/lib/portal-data";

/**
 * Trilha da Travessia — o vocacionado percorre os livros da sua turma marcando
 * capítulos lidos e, se quiser, partilhando uma reflexão sobre cada capítulo.
 * Cada estação acende no clay da marca; leitura e partilha rendem Frutos
 * (gamificação aditiva). Estado otimista local, no mesmo espírito do RSVP do
 * dashboard: o clique reflete na hora e reconcilia com o servidor por baixo.
 */
export function TravessiaCard({ travessia }: { travessia: PortalTravessia }) {
  // Fonte da verdade da UI: capítulos lidos (otimista).
  const [lidos, setLidos] = useState<Set<string>>(
    () => new Set(travessia.livros.flatMap((l) => l.capitulos.filter((c) => c.lido).map((c) => c.id)))
  );
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());
  // Partilhas por capítulo (otimista), semeadas do servidor.
  const [partilhas, setPartilhas] = useState<Map<string, TravessiaPartilha>>(
    () =>
      new Map(
        travessia.livros.flatMap((l) =>
          l.capitulos.filter((c) => c.partilha).map((c) => [c.id, c.partilha as TravessiaPartilha])
        )
      )
  );

  const totalCapitulos = travessia.totalCapitulos;
  const capitulosLidos = lidos.size;
  const fracao = totalCapitulos > 0 ? capitulosLidos / totalCapitulos : 0;
  const completo = totalCapitulos > 0 && capitulosLidos === totalCapitulos;
  // "100%" só quando TUDO foi lido — arredondar mostraria 100% em 199/200
  // (Math.round(99.5)), contradizendo o marco de conclusão.
  const percentualGeral = completo ? 100 : Math.min(99, Math.round(fracao * 100));
  // Frutos = leitura (1 por capítulo) + partilha (3 por capítulo partilhado).
  const frutosTotal =
    capitulosLidos * FRUTOS_POR_ACAO.leitura + partilhas.size * FRUTOS_POR_ACAO.partilha;

  async function toggle(capituloId: string, estaLido: boolean) {
    if (pendentes.has(capituloId)) return;
    // Otimista: aplica já e marca pendente.
    setPendentes((p) => new Set(p).add(capituloId));
    setLidos((prev) => {
      const next = new Set(prev);
      if (estaLido) next.delete(capituloId);
      else next.add(capituloId);
      return next;
    });
    try {
      const res = await fetch(`/api/portal/travessia/capitulos/${capituloId}`, {
        method: estaLido ? "DELETE" : "POST",
      });
      if (!res.ok) throw new Error();
    } catch {
      // Reverte em caso de falha.
      setLidos((prev) => {
        const next = new Set(prev);
        if (estaLido) next.add(capituloId);
        else next.delete(capituloId);
        return next;
      });
    } finally {
      setPendentes((p) => {
        const next = new Set(p);
        next.delete(capituloId);
        return next;
      });
    }
  }

  // Salva (cria/edita) a partilha do capítulo. Reconciliamos pelo servidor: a
  // reação do formador vem de lá, então não a inventamos localmente.
  async function salvarPartilha(capituloId: string, texto: string) {
    const anterior = partilhas.get(capituloId) ?? null;
    const res = await fetch(`/api/portal/travessia/capitulos/${capituloId}/partilha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    if (!res.ok) throw new Error();
    // Edição preserva a reação existente; criação começa sem reação.
    setPartilhas((prev) => {
      const next = new Map(prev);
      next.set(capituloId, {
        texto,
        formadorCurtiu: anterior?.formadorCurtiu ?? false,
        formadorNota: anterior?.formadorNota ?? null,
      });
      return next;
    });
  }

  async function removerPartilha(capituloId: string) {
    const anterior = partilhas.get(capituloId);
    // Otimista.
    setPartilhas((prev) => {
      const next = new Map(prev);
      next.delete(capituloId);
      return next;
    });
    try {
      const res = await fetch(`/api/portal/travessia/capitulos/${capituloId}/partilha`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
    } catch {
      if (anterior) {
        setPartilhas((prev) => new Map(prev).set(capituloId, anterior));
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" />
          Minha Travessia literária
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Frutos + progresso geral */}
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Sprout className="h-6 w-6 text-primary" />
            <div className="leading-tight">
              <div className="text-2xl font-bold tabular-nums text-foreground">{frutosTotal}</div>
              <div className="text-xs text-muted-foreground">
                {frutosTotal === 1 ? "Fruto da Travessia" : "Frutos da Travessia"}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium tabular-nums text-foreground">{percentualGeral}%</div>
            <div className="text-xs text-muted-foreground">
              {capitulosLidos} de {totalCapitulos}{" "}
              {totalCapitulos === 1 ? "capítulo" : "capítulos"}
            </div>
          </div>
        </div>

        {/* Marcos da travessia */}
        <div className="flex flex-wrap gap-2">
          {MARCOS_TRAVESSIA.map((m) => {
            const atingido = totalCapitulos > 0 && fracao >= m.fracao;
            return (
              <span
                key={m.chave}
                title={m.label}
                className={
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors " +
                  (atingido
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground")
                }
              >
                <Flag className="h-3 w-3" />
                {Math.round(m.fracao * 100)}%
              </span>
            );
          })}
        </div>

        {/* Trilha por livro */}
        <div className="space-y-6">
          {travessia.livros.map((livro) => (
            <LivroTrilha
              key={livro.id}
              livro={livro}
              lidos={lidos}
              pendentes={pendentes}
              partilhas={partilhas}
              onToggle={toggle}
              onSalvarPartilha={salvarPartilha}
              onRemoverPartilha={removerPartilha}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LivroTrilha({
  livro,
  lidos,
  pendentes,
  partilhas,
  onToggle,
  onSalvarPartilha,
  onRemoverPartilha,
}: {
  livro: TravessiaLivro;
  lidos: Set<string>;
  pendentes: Set<string>;
  partilhas: Map<string, TravessiaPartilha>;
  onToggle: (capituloId: string, estaLido: boolean) => void;
  onSalvarPartilha: (capituloId: string, texto: string) => Promise<void>;
  onRemoverPartilha: (capituloId: string) => void;
}) {
  const lidosNoLivro = livro.capitulos.filter((c) => lidos.has(c.id)).length;
  const completoLivro = livro.totalCapitulos > 0 && lidosNoLivro === livro.totalCapitulos;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{livro.titulo}</p>
          {livro.autor && <p className="truncate text-xs text-muted-foreground">{livro.autor}</p>}
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {lidosNoLivro}/{livro.totalCapitulos}
          {completoLivro ? " · concluído" : ""}
        </span>
      </div>

      {/* Estações verticais: círculo numerado + título; acende ao ler. */}
      <ol className="relative space-y-0">
        {livro.capitulos.map((cap, i) => {
          const estaLido = lidos.has(cap.id);
          const pendente = pendentes.has(cap.id);
          const ultimo = i === livro.capitulos.length - 1;
          return (
            <li key={cap.id} className="relative flex gap-3 pb-3 last:pb-0">
              {/* Linha conectora entre estações */}
              {!ultimo && (
                <span
                  aria-hidden
                  className={
                    "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 " +
                    (estaLido ? "bg-primary/40" : "bg-muted")
                  }
                />
              )}
              <button
                type="button"
                onClick={() => onToggle(cap.id, estaLido)}
                disabled={pendente}
                aria-pressed={estaLido}
                aria-label={`${estaLido ? "Desmarcar" : "Marcar como lido"}: capítulo ${cap.numero}`}
                className={
                  "relative z-10 flex h-8 w-8 shrink-0 cursor-pointer select-none items-center justify-center rounded-full border-2 text-xs font-semibold caret-transparent transition-colors disabled:cursor-default " +
                  (estaLido
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/30 bg-card text-muted-foreground hover:border-primary/60")
                }
              >
                {pendente ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : estaLido ? (
                  <Check className="h-4 w-4" />
                ) : (
                  cap.numero
                )}
              </button>
              <div className="flex-1 pt-1.5">
                <button
                  type="button"
                  onClick={() => onToggle(cap.id, estaLido)}
                  disabled={pendente}
                  className="cursor-pointer select-none text-left text-sm caret-transparent disabled:cursor-default"
                >
                  <span className={estaLido ? "text-foreground" : "text-muted-foreground"}>
                    <span className="text-muted-foreground/70">Cap. {cap.numero} · </span>
                    {cap.titulo}
                  </span>
                </button>
                <CapituloPartilha
                  capituloId={cap.id}
                  partilha={partilhas.get(cap.id) ?? null}
                  onSalvar={onSalvarPartilha}
                  onRemover={onRemoverPartilha}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Partilha de um capítulo: mostra a reflexão já escrita (com a reação do
 * formador, se houver) ou um convite discreto para partilhar. Editar abre uma
 * caixa inline. A reação do formador é read-only aqui — vem de quem acompanha.
 */
function CapituloPartilha({
  capituloId,
  partilha,
  onSalvar,
  onRemover,
}: {
  capituloId: string;
  partilha: TravessiaPartilha | null;
  onSalvar: (capituloId: string, texto: string) => Promise<void>;
  onRemover: (capituloId: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [salvando, setSalvando] = useState(false);

  function abrir() {
    setRascunho(partilha?.texto ?? "");
    setEditando(true);
  }

  async function salvar() {
    const texto = rascunho.trim();
    if (!texto || salvando) return;
    setSalvando(true);
    try {
      await onSalvar(capituloId, texto);
      setEditando(false);
    } catch {
      // Mantém a caixa aberta para nova tentativa.
    } finally {
      setSalvando(false);
    }
  }

  if (editando) {
    return (
      <div className="mt-2">
        <textarea
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          maxLength={2000}
          rows={3}
          autoFocus
          placeholder="O que este capítulo tocou em você?"
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
        />
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={salvar}
            disabled={salvando || !rascunho.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Salvar partilha
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            disabled={salvando}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (partilha) {
    return (
      <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
        <p className="whitespace-pre-wrap text-sm text-foreground">{partilha.texto}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={abrir}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3 w-3" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => onRemover(capituloId)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Remover
          </button>
        </div>
        {(partilha.formadorCurtiu || partilha.formadorNota) && (
          <div className="mt-2 border-t border-primary/15 pt-2">
            {partilha.formadorCurtiu && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Heart className="h-3.5 w-3.5 fill-current" />
                O formador curtiu sua partilha
              </p>
            )}
            {partilha.formadorNota && (
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Formador: </span>
                {partilha.formadorNota}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
    >
      <MessageSquareText className="h-3.5 w-3.5" />
      Partilhar reflexão
    </button>
  );
}
