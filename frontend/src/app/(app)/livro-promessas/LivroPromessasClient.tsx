"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type TipoRegistroPromessa,
  type RegistroPromessaResumo,
  TIPO_REGISTRO_PROMESSA_LABELS,
} from "@/types";

interface Props {
  orgNome: string;
  registros: RegistroPromessaResumo[];
}

const TIPO_BADGE: Record<TipoRegistroPromessa, string> = {
  iniciais_temporarias: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  renovacao:            "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  definitivas:          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  dispensa:             "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const dcurta = (iso: string) => format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });

export default function LivroPromessasClient({ orgNome, registros }: Props) {
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  const tiposPresentes = useMemo(
    () => Array.from(new Set(registros.map((r) => r.tipo))),
    [registros]
  );

  const lista = useMemo(
    () => registros.filter((r) => tipoFiltro === "todos" || r.tipo === tipoFiltro),
    [registros, tipoFiltro]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ScrollText className="h-6 w-6 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Livro de Promessas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registro cronológico das consagrações de {orgNome}. Imutável — cada assento é lavrado na
              conclusão do processo eclesiástico de promessa.
            </p>
          </div>
        </div>
        {tiposPresentes.length > 0 && (
          <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v ?? "todos")}>
            <SelectTrigger className="w-52 text-sm shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tiposPresentes.map((t) => (
                <SelectItem key={t} value={t}>{TIPO_REGISTRO_PROMESSA_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="py-14 flex flex-col items-center gap-3 text-muted-foreground">
            <ScrollText className="h-9 w-9 opacity-30" />
            <p className="text-sm">Nenhum registro de promessa lavrado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lista.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4 px-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      Tomo {r.tomo} · Folha {String(r.folha).padStart(3, "0")} · Registro nº {r.numeroRegistro}
                    </span>
                    <Badge className={TIPO_BADGE[r.tipo]} variant="secondary">
                      {TIPO_REGISTRO_PROMESSA_LABELS[r.tipo]}
                    </Badge>
                  </div>
                  <span className="text-sm font-medium">{r.formandoNome ?? "—"}</span>
                </div>

                <p className="text-sm leading-relaxed">{r.formulaTexto}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  <span><strong className="font-medium text-foreground">Celebrante:</strong> {r.celebrante}</span>
                  <span><strong className="font-medium text-foreground">Local:</strong> {r.localCelebracao}</span>
                  <span><strong className="font-medium text-foreground">Moderador(a) Geral:</strong> {r.moderadorGeral}</span>
                  <span><strong className="font-medium text-foreground">Secretário(a):</strong> {r.secretario}</span>
                  <span>
                    <strong className="font-medium text-foreground">Vigência:</strong>{" "}
                    {r.dataVigenciaFim
                      ? `${dcurta(r.dataVigenciaInicio)} a ${dcurta(r.dataVigenciaFim)}`
                      : `${dcurta(r.dataVigenciaInicio)} — perpétua`}
                  </span>
                  {r.assistenteEclesiastico && (
                    <span><strong className="font-medium text-foreground">Assistente eclesiástico:</strong> {r.assistenteEclesiastico}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
