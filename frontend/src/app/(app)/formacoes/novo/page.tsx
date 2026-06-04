import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrade, toPlano } from "@/lib/converters";
import FormacaoFormPage from "../FormacaoFormPage";
import type { PerfilUsuario, Usuario } from "@/types";

export default async function NovaFormacaoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as { organizacaoId?: string };
  if (!user.organizacaoId) redirect("/login");
  const orgId = user.organizacaoId;

  const [planos, grades, usuarios] = await Promise.all([
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

  const initialUsuarios: Usuario[] = usuarios.map((u) => ({
    id: u.id, nome: u.nome, email: u.email,
    perfil: u.perfil as PerfilUsuario,
    ativo: u.ativo, criadoEm: u.criadoEm.toISOString(),
  }));

  return (
    <FormacaoFormPage
      initialGrades={grades.map(toGrade)}
      initialPlanos={planos.map(toPlano)}
      initialUsuarios={initialUsuarios}
    />
  );
}
