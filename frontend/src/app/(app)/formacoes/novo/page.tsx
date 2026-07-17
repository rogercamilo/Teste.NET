import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrade, toPlano } from "@/lib/converters";
import FormacaoFormPage from "../FormacaoFormPage";

export default async function NovaFormacaoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as { organizacaoId?: string };
  if (!user.organizacaoId) redirect("/login");
  const orgId = user.organizacaoId;

  const [planos, grades] = await Promise.all([
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
  ]);

  return (
    <FormacaoFormPage
      initialGrades={grades.map(toGrade)}
      initialPlanos={planos.map(toPlano)}
    />
  );
}
