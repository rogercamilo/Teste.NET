import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  toGrupoFormacao,
  toFormando,
  toAgendamento,
  toPresenca,
  toComentario,
  toPlano,
  toGrade,
  toRelatorio,
} from "@/lib/converters";
import GrupoFormacaoDetail from "./GrupoFormacaoDetail";
import type { PerfilUsuario, Usuario } from "@/types";

export default async function GrupoFormacaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);

  if (!session?.user) redirect("/login");

  const user = session.user as {
    role?: string;
    id?: string;
    organizacaoId?: string;
    grupoFormacaoId?: string | null;
  };

  if (!user.organizacaoId) redirect("/login");

  if (user.role === "formador_comunitario" && user.grupoFormacaoId !== id) {
    redirect(`/grupos-formacao/${user.grupoFormacaoId ?? ""}`);
  }

  const orgId = user.organizacaoId;

  const grupo = await prisma.grupoFormacao.findFirst({
    where: { id, organizacaoId: orgId },
  });

  if (!grupo) redirect("/grupos-formacao");

  const [formandos, agendamentos, planos, grades, usuarios, relatorios] =
    await Promise.all([
      prisma.formando.findMany({
        where: { grupoFormacaoId: id, organizacaoId: orgId, deletedAt: null },
        include: { progressoEtapas: true },
        orderBy: { nome: "asc" },
      }),
      prisma.agendamento.findMany({
        where: { grupoFormacaoId: id, organizacaoId: orgId, deletedAt: null },
        orderBy: { dataInicio: "desc" },
      }),
      prisma.planoFormativo.findMany({
        where: {
          OR: [{ organizacaoId: orgId }, { isGlobal: true }],
          status: { not: "arquivado" },
        },
        include: { eixos: { orderBy: { ordem: "asc" } }, retiros: true },
        orderBy: { nome: "asc" },
      }),
      prisma.gradeFormativa.findMany({
        where: {
          OR: [{ organizacaoId: orgId }, { isGlobal: true }],
          ativo: true,
        },
        include: {
          eixos: {
            orderBy: { ordem: "asc" },
            include: { etapas: { orderBy: { ordem: "asc" } } },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.usuario.findMany({
        where: { organizacaoId: orgId, ativo: true, deletedAt: null },
        orderBy: { nome: "asc" },
      }),
      prisma.relatorioEtapa.findMany({
        where: { organizacaoId: orgId, formando: { grupoFormacaoId: id } },
      }),
    ]);

  const formandoIds = formandos.map((f) => f.id);
  const agendamentoIds = agendamentos.map((a) => a.id);

  const [presencas, comentarios] = await Promise.all([
    agendamentoIds.length > 0
      ? prisma.presencaFormacao.findMany({
          where: { agendamentoId: { in: agendamentoIds }, organizacaoId: orgId },
        })
      : Promise.resolve([]),
    formandoIds.length > 0
      ? prisma.comentarioFormando.findMany({
          where: { formandoId: { in: formandoIds }, organizacaoId: orgId },
          orderBy: { criadoEm: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const initialUsuarios: Usuario[] = usuarios.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil as PerfilUsuario,
    ativo: u.ativo,
    criadoEm: u.criadoEm.toISOString(),
    grupoFormacaoId: u.grupoFormacaoId ?? undefined,
  }));

  return (
    <GrupoFormacaoDetail
      id={id}
      userRole={user.role ?? "formador_comunitario"}
      userId={user.id ?? ""}
      initialGrupoFormacao={toGrupoFormacao(grupo)}
      initialFormandos={formandos.map(toFormando)}
      initialAgendamentos={agendamentos.map(toAgendamento)}
      initialPresencas={presencas.map(toPresenca)}
      initialComentarios={comentarios.map(toComentario)}
      initialPlanos={planos.map(toPlano)}
      initialGrades={grades.map(toGrade)}
      initialUsuarios={initialUsuarios}
      initialRelatorios={relatorios.map(toRelatorio)}
    />
  );
}
