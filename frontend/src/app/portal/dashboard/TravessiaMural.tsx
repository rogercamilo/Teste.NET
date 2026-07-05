"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Sprout, Loader2 } from "lucide-react";
import type { TravessiaMural } from "@/lib/portal-data";

/**
 * Mural de Frutos da turma — vive no bloco de informações gerais do topo (não
 * dentro da Travessia pessoal). Celebra o caminho COLETIVO: total da turma + os
 * cards de quem optou por aparecer (sem ranking). O vocacionado escolhe se se
 * exibe; o card dele entra/sai na hora (otimista) e reordena alfabeticamente.
 * `meusFrutos` é o total do próprio vocacionado (snapshot do servidor no load).
 */
export function MuralSection({
  muralInicial,
  meusFrutos,
}: {
  muralInicial: TravessiaMural;
  meusFrutos: number;
}) {
  const [exibir, setExibir] = useState(muralInicial.minhaExibicao);
  const [salvando, setSalvando] = useState(false);

  const participantes = [
    ...muralInicial.participantes,
    ...(exibir && muralInicial.meuNome ? [{ nome: muralInicial.meuNome, frutos: meusFrutos, eu: true }] : []),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  async function alternar() {
    if (salvando) return;
    const novo = !exibir;
    setExibir(novo);
    setSalvando(true);
    try {
      const res = await fetch("/api/portal/travessia/mural", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: novo }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setExibir(!novo);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Mural de Frutos da turma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total coletivo + opt-in lado a lado no desktop */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-3">
            <Sprout className="h-7 w-7 shrink-0 text-primary" />
            <div className="leading-tight">
              <div className="text-2xl font-bold tabular-nums text-foreground">
                {muralInicial.turmaFrutosTotal}
              </div>
              <div className="text-xs text-muted-foreground">Frutos colhidos pela turma 🌱</div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5">
            <button
              type="button"
              role="switch"
              aria-checked={exibir}
              aria-label="Aparecer no mural"
              onClick={alternar}
              disabled={salvando}
              className={
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 " +
                (exibir ? "bg-primary" : "bg-muted-foreground/30")
              }
            >
              {salvando ? (
                <Loader2 className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 animate-spin text-white" />
              ) : (
                <span
                  className={
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
                    (exibir ? "translate-x-5" : "translate-x-0.5")
                  }
                />
              )}
            </button>
            <span className="text-sm">
              Aparecer no mural com meus Frutos
              <span className="block text-xs text-muted-foreground">Sem ranking — só para celebrar juntos.</span>
            </span>
          </div>
        </div>

        {/* Cards de quem optou por aparecer — espalham na largura toda */}
        {participantes.length > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {participantes.map((p, i) => (
              <div
                key={`${p.nome}-${i}`}
                className={
                  "rounded-md border px-3 py-2 " +
                  ("eu" in p && p.eu ? "border-primary/40 bg-primary/5" : "bg-card")
                }
              >
                <p className="truncate text-sm font-medium">
                  {p.nome}
                  {"eu" in p && p.eu ? (
                    <span className="text-xs font-normal text-muted-foreground"> · você</span>
                  ) : null}
                </p>
                <p className="flex items-center gap-1 text-xs text-primary">
                  <Sprout className="h-3 w-3" />
                  {p.frutos} {p.frutos === 1 ? "Fruto" : "Frutos"}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
