import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import RsvpClient from "./RsvpClient";
import type { RsvpResposta } from "@/lib/rsvp";

export default async function RsvpPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ag?: string; resp?: string }>;
}) {
  const { token } = await params;
  const { ag, resp } = await searchParams;

  const formando = await prisma.formando.findUnique({
    where: { tokenAssinatura: token },
    select: {
      id: true,
      nome: true,
      organizacaoId: true,
      grupoFormacaoId: true,
      deletedAt: true,
      organizacao: { select: { nome: true } },
    },
  });
  if (!formando || formando.deletedAt) notFound();

  // Agendamento (só para exibição) — escopado à org e à relevância do formando.
  const agendamento = ag
    ? await prisma.agendamento.findFirst({
        where: {
          id: ag,
          organizacaoId: formando.organizacaoId,
          deletedAt: null,
          OR: [{ grupoFormacaoId: null }, { grupoFormacaoId: formando.grupoFormacaoId }],
        },
        select: { id: true, formacaoTema: true, dataInicio: true },
      })
    : null;

  const respInicial: RsvpResposta | null = resp === "sim" || resp === "nao" ? resp : null;

  return (
    <RsvpClient
      token={token}
      formandoNome={formando.nome}
      orgNome={formando.organizacao.nome}
      agendamentoId={agendamento?.id ?? null}
      agendamentoTema={agendamento?.formacaoTema ?? null}
      agendamentoData={agendamento?.dataInicio.toISOString() ?? null}
      respInicial={respInicial}
    />
  );
}
