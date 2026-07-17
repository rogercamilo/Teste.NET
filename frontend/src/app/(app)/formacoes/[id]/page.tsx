import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormacao } from "@/lib/converters";
import FormacaoDetalheClient, { type Realizacao } from "./FormacaoDetalheClient";

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
    include: {
      plano: { select: { nome: true } },
      grade: { select: { nome: true } },
      eixo: { select: { nome: true } },
      _count: { select: { agendamentos: { where: { deletedAt: null } } } },
    },
  });

  if (!formacao) redirect("/formacoes");

  // Realizações auditáveis (G6): derivadas dos agendamentos que executaram esta formação.
  const agendamentos = await prisma.agendamento.findMany({
    where: { formacaoId: id, deletedAt: null },
    orderBy: { dataInicio: "desc" },
    select: { id: true, dataInicio: true, status: true, formadorNome: true, participantes: true },
  });
  const realizacoes: Realizacao[] = agendamentos.map((a) => ({
    id: a.id,
    data: a.dataInicio.toISOString().split("T")[0],
    status: a.status,
    formadorNome: a.formadorNome,
    participantes: a.participantes,
  }));

  const canEdit =
    user.role === "formador_geral" || user.role === "administrador";

  return (
    <FormacaoDetalheClient
      formacao={toFormacao(formacao)}
      realizacoes={realizacoes}
      canEdit={canEdit}
    />
  );
}
