import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import AtivarNotificacoesClient from "./AtivarNotificacoesClient";

export default async function AtivarNotificacoesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const formando = await prisma.formando.findUnique({
    where: { tokenAssinatura: token },
    select: {
      id: true,
      nome: true,
      deletedAt: true,
      grupoFormacao: { select: { nome: true } },
      organizacao: { select: { nome: true } },
    },
  });

  if (!formando || formando.deletedAt) notFound();

  return (
    <AtivarNotificacoesClient
      token={token}
      nome={formando.nome}
      grupoNome={formando.grupoFormacao?.nome ?? null}
      orgNome={formando.organizacao.nome}
    />
  );
}
