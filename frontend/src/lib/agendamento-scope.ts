import "server-only";

import type { Prisma } from "@prisma/client";

export interface FormandoScope {
  id: string;
  grupoFormacaoId: string | null;
  nivelFormativo: string;
}

/**
 * Fonte ÚNICA da regra "agendamentos relevantes a um formando" — usada tanto na
 * visibilidade do portal (próximos encontros) quanto no escopo de RSVP
 * (confirmar/justificar presença). Garante que "o que o formando vê, ele pode
 * responder" e vice-versa. Cobre:
 *  - encontros do próprio grupo (campo legado + junção multi-grupo, item 1.7);
 *  - Acompanhamento Comunitário 1:1 marcado para ele (privado, por alvo);
 *  - eventos org-wide ("todos os grupos"): Convocação/Assembleia Geral valem para
 *    qualquer nível; formação/retiro/outro sem grupo valem só p/ o mesmo nível.
 */
export function agendamentoRelevanteOR(
  formando: FormandoScope
): Prisma.AgendamentoWhereInput[] {
  return [
    ...(formando.grupoFormacaoId
      ? [
          { grupoFormacaoId: formando.grupoFormacaoId },
          { grupos: { some: { grupoFormacaoId: formando.grupoFormacaoId } } },
        ]
      : []),
    { tipoEvento: "acompanhamento_comunitario", acompanhadoFormandoId: formando.id },
    { grupoFormacaoId: null, grupos: { none: {} }, tipoEvento: { in: ["convocacao", "reuniao"] } },
    {
      grupoFormacaoId: null,
      grupos: { none: {} },
      tipoEvento: { in: ["formacao", "retiro", "outro"] },
      nivelFormativo: formando.nivelFormativo,
    },
  ];
}
