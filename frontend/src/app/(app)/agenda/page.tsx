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

  const me = user.id ?? "";
  // Escopo de papel para eventos COLETIVOS (não-acompanhamento).
  const roleScope: Record<string, unknown> = {};
  if (user.role === "formador_comunitario") {
    const gid = user.grupoFormacaoId ?? null;
    roleScope.OR = [
      { grupoFormacaoId: gid },
      { formadorId: me },
      // Multi-grupo (item 1.7): eventos que incluem a morada do FC via junção.
      ...(gid ? [{ grupos: { some: { grupoFormacaoId: gid } } }] : []),
    ];
  }
  // Acompanhamento Comunitário é privado: visível só ao criador ou ao alvo.
  const agendamentosWhere: Record<string, unknown> = {
    organizacaoId: user.organizacaoId,
    deletedAt: null,
    OR: [
      { tipoEvento: { not: "acompanhamento_comunitario" }, ...roleScope },
      {
        tipoEvento: "acompanhamento_comunitario",
        OR: [{ formadorId: me }, { acompanhadoUsuarioId: me }],
      },
    ],
  };

  // Formandos para o vínculo opcional de compromisso (FC → próprio grupo; gestão → org).
  const formandosWhere: Record<string, unknown> = { organizacaoId: user.organizacaoId, ativo: true, deletedAt: null };
  if (user.role === "formador_comunitario") formandosWhere.grupoFormacaoId = user.grupoFormacaoId ?? null;

  const [agendamentosRaw, formacoesRaw, gruposFormacaoRaw, compromissosRaw, formandosRaw, formadoresRaw] = await Promise.all([
    prisma.agendamento.findMany({
      where: agendamentosWhere,
      orderBy: { dataInicio: "desc" },
      include: {
        grupos: { select: { grupoFormacaoId: true } },
        acompanhadoFormando: { select: { nome: true } },
        acompanhadoUsuario: { select: { nome: true } },
      },
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
    // Alvos do Acompanhamento Comunitário no fluxo do Formador Geral: formadores
    // comunitários e pedagógicos do tenant. Só carrega para FG.
    user.role === "formador_geral"
      ? prisma.usuario.findMany({
          where: {
            organizacaoId: user.organizacaoId,
            // Formadores de campo (comunitário e, futuramente, pedagógico) — nunca
            // gestão/plataforma. Ver comentário na rota POST de agendamentos.
            perfil: { notIn: ["administrador", "formador_geral", "super_admin"] },
            ativo: true,
            deletedAt: null,
          },
          select: { id: true, nome: true },
          orderBy: { nome: "asc" },
        })
      : Promise.resolve([] as { id: string; nome: string }[]),
  ]);

  // Lista de pessoas acompanháveis, conforme o papel: FC → formandos do próprio
  // grupo; FG → formadores comunitários/pedagógicos. Demais papéis não criam.
  const alvosAcompanhamento =
    user.role === "formador_comunitario"
      ? formandosRaw.map((f) => ({ tipo: "formando" as const, id: f.id, nome: f.nome }))
      : user.role === "formador_geral"
        ? formadoresRaw.map((u) => ({ tipo: "usuario" as const, id: u.id, nome: u.nome }))
        : [];

  return (
    <AgendaClient
      initialAgendamentos={agendamentosRaw.map(toAgendamento)}
      initialFormacoes={formacoesRaw.map(toFormacao)}
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
      initialCompromissos={compromissosRaw.map(toCompromisso)}
      formandosVinculo={formandosRaw}
      alvosAcompanhamento={alvosAcompanhamento}
      role={user.role ?? "formador_comunitario"}
      userId={user.id ?? ""}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
    />
  );
}
