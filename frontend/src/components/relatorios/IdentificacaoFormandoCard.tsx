"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveImageSrc, idadeEmAnos } from "@/lib/utils";
import { ESTADO_CIVIL_LABELS, type EstadoCivil, type Formando } from "@/types";

/**
 * Cartão de identificação visual do formando (foto + dados básicos) — usado no
 * diálogo da aba Relatórios e espelhado no PDF de identificação.
 */
export function IdentificacaoFormandoCard({
  formando,
  etapaLabel,
  grupoNome,
}: {
  formando: Pick<Formando, "nome" | "foto" | "dataNascimento" | "estadoCivil">;
  etapaLabel: string;
  grupoNome?: string;
}) {
  const idade = idadeEmAnos(formando.dataNascimento);
  const foto = resolveImageSrc(formando.foto);
  const initials = formando.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  const linhas: [string, string][] = [
    ["Idade", idade != null ? `${idade} anos` : "—"],
    ["Estado civil", ESTADO_CIVIL_LABELS[formando.estadoCivil as EstadoCivil] ?? "—"],
    ["Etapa", etapaLabel],
  ];
  if (grupoNome) linhas.push(["Grupo", grupoNome]);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <Avatar className="h-28 w-28">
        {foto && <AvatarImage src={foto} alt={formando.nome} className="object-cover" />}
        <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <p className="text-lg font-semibold text-center">{formando.nome}</p>
      <dl className="w-full max-w-xs space-y-1.5 text-sm">
        {linhas.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
