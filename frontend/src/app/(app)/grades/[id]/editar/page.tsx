import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrade, toFormacao, toPlano } from "@/lib/converters";
import GradeFormPage from "../../GradeFormPage";
import type { PerfilUsuario, Usuario } from "@/types";

export default async function EditarGradePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  if (!session?.user) redirect("/login");
  const user = session.user as { organizacaoId?: string; role?: string };
  if (!user.organizacaoId) redirect("/login");
  const orgId = user.organizacaoId;

  const grade = await prisma.gradeFormativa.findFirst({
    where: { id, OR: [{ organizacaoId: orgId }, { isGlobal: true }] },
    include: {
      eixos: {
        orderBy: { ordem: "asc" },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      },
    },
  });

  if (!grade) redirect("/grades");

  const [planos, formacoes, usuarios] = await Promise.all([
    prisma.planoFormativo.findMany({
      where: { OR: [{ organizacaoId: orgId }, { isGlobal: true }], status: { not: "arquivado" } },
      include: { eixos: { orderBy: { ordem: "asc" } }, retiros: true },
      orderBy: { nome: "asc" },
    }),
    prisma.formacao.findMany({
      where: { gradeId: id, OR: [{ organizacaoId: orgId }, { isGlobal: true }], deletedAt: null },
      orderBy: { numero: "asc" },
    }),
    prisma.usuario.findMany({
      where: { organizacaoId: orgId, ativo: true, deletedAt: null },
      orderBy: { nome: "asc" },
    }),
  ]);

  const initialUsuarios: Usuario[] = usuarios.map((u) => ({
    id: u.id, nome: u.nome, email: u.email,
    perfil: u.perfil as PerfilUsuario,
    ativo: u.ativo, criadoEm: u.criadoEm.toISOString(),
  }));

  return (
    <GradeFormPage
      id={id}
      role={user.role ?? "formador_comunitario"}
      initialGrade={toGrade(grade)}
      initialFormacoes={formacoes.map(toFormacao)}
      initialPlanos={planos.map(toPlano)}
      initialUsuarios={initialUsuarios}
    />
  );
}
