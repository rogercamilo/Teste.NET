import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toAgendamento, toFormando, toPresenca } from "@/lib/converters";
import { type SessionUser } from "@/lib/auth-helpers";
import PresencaClient from "./PresencaClient";

export default async function PresencaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  if (!user.organizacaoId) redirect("/login");

  const where: Record<string, unknown> = {
    organizacaoId: user.organizacaoId,
    deletedAt: null,
  };
  if (user.role === "formador_comunitario") {
    where.grupoFormacaoId = user.grupoFormacaoId ?? null;
  }

  const [agendamentosRaw, formandosRaw, presencasRaw] = await Promise.all([
    prisma.agendamento.findMany({
      where,
      orderBy: { dataInicio: "desc" },
    }),
    prisma.formando.findMany({
      where: { organizacaoId: user.organizacaoId, ativo: true, deletedAt: null },
      include: { progressoEtapas: true },
      orderBy: { nome: "asc" },
    }),
    prisma.presencaFormacao.findMany({
      where: { organizacaoId: user.organizacaoId },
    }),
  ]);

  return (
    <PresencaClient
      initialAgendamentos={agendamentosRaw.map(toAgendamento)}
      initialFormandos={formandosRaw.map(toFormando)}
      initialPresencas={presencasRaw.map(toPresenca)}
      role={user.role ?? "formador_comunitario"}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
    />
  );
}
