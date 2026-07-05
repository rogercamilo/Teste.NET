"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Sprout, Loader2, ArrowDown } from "lucide-react";
import type { TravessiaMural } from "@/lib/portal-data";

/**
 * Mural de Frutos da turma — vive no bloco de informações gerais do topo. É a
 * VISÃO coletiva (read-only): total da turma + os cards de quem optou por
 * aparecer. O controle "Aparecer no mural" fica junto da Missão (na Travessia),
 * então aqui recebemos `exibir` como prop controlada. `meusFrutos` é o total do
 * próprio vocacionado (snapshot do servidor no load).
 */
export function MuralSection({
  muralInicial,
  meusFrutos,
  exibir,
}: {
  muralInicial: TravessiaMural;
  meusFrutos: number;
  exibir: boolean;
}) {
  // Os outros participantes (do servidor, sem mim) + o meu card quando estou me
  // exibindo — reordenados alfabeticamente (sem ranking). Some/aparece na hora.
  const participantes = [
    ...muralInicial.participantes,
    ...(exibir && muralInicial.meuNome ? [{ nome: muralInicial.meuNome, frutos: meusFrutos, eu: true }] : []),
  ].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Mural de Frutos da turma
        </CardTitle>
        <CardDescription>
          O quanto a turma já colheu <strong>junta</strong> na Travessia — a soma dos Frutos de todos
          (leitura, partilhas e evangelização). Sem ranking: é para celebrar o caminho em comunidade.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Total coletivo à esquerda, quem aparece à direita (one view no desktop) */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Total coletivo — número protagonista */}
          <div className="flex items-center gap-3 rounded-lg border bg-primary/5 px-4 py-3 md:col-span-1">
            <Sprout className="h-8 w-8 shrink-0 text-primary" />
            <div className="leading-tight">
              <div className="text-3xl font-bold tabular-nums text-foreground">
                {muralInicial.turmaFrutosTotal}
              </div>
              <div className="text-xs text-muted-foreground">
                Frutos colhidos pela turma inteira 🌱
              </div>
            </div>
          </div>

          {/* Quem escolheu aparecer */}
          <div className="md:col-span-2">
            {participantes.length > 0 ? (
              <>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Quem está aparecendo no mural ({participantes.length})
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
              </>
            ) : (
              <p className="flex h-full items-center gap-1.5 rounded-md border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                Ninguém apareceu ainda. Ative{" "}
                <strong className="font-medium text-foreground">“Aparecer no mural”</strong> na Missão
                (abaixo) para ser o primeiro.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Controle "Aparecer no mural" — vive junto da Missão, na Travessia. É a AÇÃO que
 * insere/remove o card do vocacionado no Mural do topo (estado controlado pelo
 * DashboardClient para os dois lados reagirem juntos). `div` (não `label`): um
 * `button` é labelável e o label re-dispararia o toggle no clique do texto.
 */
export function MuralOptInToggle({
  exibir,
  salvando,
  onToggle,
}: {
  exibir: boolean;
  salvando: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5">
      <button
        type="button"
        role="switch"
        aria-checked={exibir}
        aria-label="Aparecer no mural de Frutos da turma"
        onClick={onToggle}
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
        Aparecer no Mural de Frutos da turma
        <span className="block text-xs text-muted-foreground">
          {exibir
            ? "Seus Frutos estão visíveis no mural (lá em cima). Sem ranking."
            : "Mostre seus Frutos no mural da turma (lá em cima). Sem ranking."}
        </span>
      </span>
    </div>
  );
}
