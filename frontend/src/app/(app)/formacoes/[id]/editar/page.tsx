import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormacao, toGrade, toPlano } from "@/lib/converters";
import FormacaoFormPage from "../../FormacaoFormPage";
import type { PerfilUsuario, Usuario } from "@/types";

export default async function EditarFormacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/login");
  const user = session.user as { organizacaoId?: string };
  if (!user.organizacaoId) redirect("/login");
  const orgId = user.organizacaoId;

  const [formacao, planos, grades, usuarios] = await Promise.all([
    prisma.formacao.findFirst({
      where: { id, OR: [{ organizacaoId: orgId }, { isGlobal: true }], deletedAt: null },
    }),
    prisma.planoFormativo.findMany({
      where: { OR: [{ organizacaoId: orgId }, { isGlobal: true }], status: { not: "arquivado" } },
      include: { eixos: { orderBy: { ordem: "asc" } }, retiros: true },
      orderBy: { nome: "asc" },
    }),
    prisma.gradeFormativa.findMany({
      where: { OR: [{ organizacaoId: orgId }, { isGlobal: true }], ativo: true },
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
  ]);

  if (!formacao) redirect("/formacoes");

  const initialUsuarios: Usuario[] = usuarios.map((u) => ({
    id: u.id, nome: u.nome, email: u.email,
    perfil: u.perfil as PerfilUsuario,
    ativo: u.ativo, criadoEm: u.criadoEm.toISOString(),
  }));

  return (
    <FormacaoFormPage
      id={id}
      initialFormacao={toFormacao(formacao)}
      initialGrades={grades.map(toGrade)}
      initialPlanos={planos.map(toPlano)}
      initialUsuarios={initialUsuarios}
    />
  );
}
