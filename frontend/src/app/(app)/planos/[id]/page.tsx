import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toPlano } from "@/lib/converters";
import PlanoDetalheClient from "./PlanoDetalheClient";

export default async function PlanoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/login");

  const user = session.user as { organizacaoId?: string; role?: string };
  if (!user.organizacaoId) redirect("/login");

  const plano = await prisma.planoFormativo.findFirst({
    where: {
      id,
      OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }],
    },
    include: {
      eixos: { orderBy: { ordem: "asc" } },
      retiros: true,
    },
  });

  if (!plano) redirect("/planos");

  const isAdmin =
    user.role === "formador_geral" || user.role === "administrador";

  return <PlanoDetalheClient plano={toPlano(plano)} isAdmin={isAdmin} />;
}
