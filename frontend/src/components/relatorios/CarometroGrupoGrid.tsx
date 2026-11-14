"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageSrc, idadeEmAnos } from "@/lib/utils";
import { ESTADO_CIVIL_LABELS, type EstadoCivil, type Formando, type NivelFormativo } from "@/types";

type FormandoCarometro = Pick<
  Formando,
  "id" | "nome" | "foto" | "dataNascimento" | "estadoCivil" | "nivelFormativo"
>;

/**
 * Carômetro consolidado: grade com TODOS os formandos do grupo (foto + nome +
 * idade + estado civil + etapa) numa só tela, para o reconhecimento visual no
 * discernimento das autoridades. Espelha o cartão individual
 * (IdentificacaoFormandoCard) em layout compacto. Ordena por nome.
 */
export function CarometroGrupoGrid({
  formandos,
  etapaLabels,
}: {
  formandos: FormandoCarometro[];
  etapaLabels: Record<NivelFormativo, string>;
}) {
  const ordenados = [...formandos].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
  );

  if (ordenados.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhum formando ativo nesta turma.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {ordenados.map((f) => {
        const idade = idadeEmAnos(f.dataNascimento);
        const foto = resolveImageSrc(f.foto);
        const initials = f.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
        return (
          <div
            key={f.id}
            className="flex min-w-0 flex-col items-center gap-2 rounded-lg border border-border/60 bg-card p-3 text-center"
          >
            <Avatar className="h-20 w-20">
              {foto && <AvatarImage src={foto} alt={f.nome} className="object-cover" />}
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <p className="w-full truncate text-sm font-semibold" title={f.nome}>
              {f.nome}
            </p>
            <dl className="w-full space-y-0.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-center gap-1">
                <dt className="sr-only">Idade</dt>
                <dd>{idade != null ? `${idade} anos` : "Idade —"}</dd>
              </div>
              <div className="flex items-center justify-center gap-1">
                <dt className="sr-only">Estado civil</dt>
                <dd>{ESTADO_CIVIL_LABELS[f.estadoCivil as EstadoCivil] ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-center gap-1">
                <dt className="sr-only">Etapa</dt>
                <dd className="font-medium text-foreground">{etapaLabels[f.nivelFormativo]}</dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}
