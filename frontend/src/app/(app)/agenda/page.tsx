import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toAgendamento, toFormacao, toGrupoFormacao } from "@/lib/converters";
import { type SessionUser } from "@/lib/auth-helpers";
import AgendaClient from "./AgendaClient";

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  if (!user.organizacaoId) redirect("/login");

  const agendamentosWhere: Record<string, unknown> = {
    organizacaoId: user.organizacaoId,
    deletedAt: null,
  };
  if (user.role === "formador_comunitario") {
    agendamentosWhere.OR = [
      { grupoFormacaoId: user.grupoFormacaoId ?? null },
      { formadorId: user.id ?? "" },
    ];
  }

  const [agendamentosRaw, formacoesRaw, gruposFormacaoRaw] = await Promise.all([
    prisma.agendamento.findMany({
      where: agendamentosWhere,
      orderBy: { dataInicio: "desc" },
    }),
    prisma.formacao.findMany({
      where: {
        OR: [
          { organizacaoId: user.organizacaoId },
          { isGlobal: true },
        ],
        deletedAt: null,
      },
      orderBy: { tema: "asc" },
    }),
    prisma.grupoFormacao.findMany({
      where: { organizacaoId: user.organizacaoId, ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <AgendaClient
      initialAgendamentos={agendamentosRaw.map(toAgendamento)}
      initialFormacoes={formacoesRaw.map(toFormacao)}
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
      role={user.role ?? "formador_comunitario"}
      userId={user.id ?? ""}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
    />
  );
}
