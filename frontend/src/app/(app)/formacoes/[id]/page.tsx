import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormacao } from "@/lib/converters";
import FormacaoDetalheClient from "./FormacaoDetalheClient";

export default async function FormacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/login");

  const user = session.user as { organizacaoId?: string; role?: string };
  if (!user.organizacaoId) redirect("/login");

  const formacao = await prisma.formacao.findFirst({
    where: {
      id,
      OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }],
      deletedAt: null,
    },
  });

  if (!formacao) redirect("/formacoes");

  const canEdit =
    user.role === "formador_geral" || user.role === "administrador";

  return <FormacaoDetalheClient formacao={toFormacao(formacao)} canEdit={canEdit} />;
}
