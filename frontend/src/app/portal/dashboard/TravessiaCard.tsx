"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sprout, Flag, Loader2 } from "lucide-react";
import { MARCOS_TRAVESSIA } from "@/types";
import type { PortalTravessia, TravessiaLivro } from "@/lib/portal-data";

/**
 * Trilha da Travessia — o vocacionado percorre os livros da sua turma marcando
 * capítulos lidos. Cada estação acende no clay da marca; a leitura rende Frutos
 * (gamificação aditiva). Estado otimista local, no mesmo espírito do RSVP do
 * dashboard: o clique reflete na hora e reconcilia com o servidor por baixo.
 */
export function TravessiaCard({ travessia }: { travessia: PortalTravessia }) {
  // Fonte da verdade da UI: conjunto de capítulos lidos (otimista).
  const [lidos, setLidos] = useState<Set<string>>(
    () => new Set(travessia.livros.flatMap((l) => l.capitulos.filter((c) => c.lido).map((c) => c.id)))
  );
  const [pendentes, setPendentes] = useState<Set<string>>(new Set());

  const totalCapitulos = travessia.totalCapitulos;
  const capitulosLidos = lidos.size;
  const fracao = totalCapitulos > 0 ? capitulosLidos / totalCapitulos : 0;
  const completo = totalCapitulos > 0 && capitulosLidos === totalCapitulos;
  // "100%" só quando TUDO foi lido — arredondar mostraria 100% em 199/200
  // (Math.round(99.5)), contradizendo o marco de conclusão.
  const percentualGeral = completo ? 100 : Math.min(99, Math.round(fracao * 100));
  // 1 Fruto por capítulo lido (valor fixo do sistema; ações extras virão depois).
  const frutosTotal = capitulosLidos;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" />
          Minha Travessia literaria
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
              onToggle={toggle}
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
  onToggle,
}: {
  livro: TravessiaLivro;
  lidos: Set<string>;
  pendentes: Set<string>;
  onToggle: (capituloId: string, estaLido: boolean) => void;
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
              <button
                type="button"
                onClick={() => onToggle(cap.id, estaLido)}
                disabled={pendente}
                className="flex-1 cursor-pointer select-none pt-1.5 text-left text-sm caret-transparent disabled:cursor-default"
              >
                <span className={estaLido ? "text-foreground" : "text-muted-foreground"}>
                  <span className="text-muted-foreground/70">Cap. {cap.numero} · </span>
                  {cap.titulo}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
