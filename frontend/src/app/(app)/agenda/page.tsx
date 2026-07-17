import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toAgendamento, toFormacao, toGrupoFormacao, toCompromisso } from "@/lib/converters";
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
    const gid = user.grupoFormacaoId ?? null;
    agendamentosWhere.OR = [
      { grupoFormacaoId: gid },
      { formadorId: user.id ?? "" },
      // Multi-grupo (item 1.7): eventos que incluem a morada do FC via junção.
      ...(gid ? [{ grupos: { some: { grupoFormacaoId: gid } } }] : []),
    ];
  }

  // Formandos para o vínculo opcional de compromisso (FC → próprio grupo; gestão → org).
  const formandosWhere: Record<string, unknown> = { organizacaoId: user.organizacaoId, ativo: true, deletedAt: null };
  if (user.role === "formador_comunitario") formandosWhere.grupoFormacaoId = user.grupoFormacaoId ?? null;

  const [agendamentosRaw, formacoesRaw, gruposFormacaoRaw, compromissosRaw, formandosRaw] = await Promise.all([
    prisma.agendamento.findMany({
      where: agendamentosWhere,
      orderBy: { dataInicio: "desc" },
      include: { grupos: { select: { grupoFormacaoId: true } } },
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
      include: { eixo: { select: { nome: true } } },
    }),
    prisma.grupoFormacao.findMany({
      where: { organizacaoId: user.organizacaoId, ativo: true },
      orderBy: { nome: "asc" },
    }),
    // Compromissos são privados: só os do próprio usuário.
    prisma.compromisso.findMany({
      where: { organizacaoId: user.organizacaoId, formadorId: user.id ?? "" },
      orderBy: { dataInicio: "asc" },
    }),
    prisma.formando.findMany({
      where: formandosWhere,
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <AgendaClient
      initialAgendamentos={agendamentosRaw.map(toAgendamento)}
      initialFormacoes={formacoesRaw.map(toFormacao)}
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
      initialCompromissos={compromissosRaw.map(toCompromisso)}
      formandosVinculo={formandosRaw}
      role={user.role ?? "formador_comunitario"}
      userId={user.id ?? ""}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
    />
  );
}
