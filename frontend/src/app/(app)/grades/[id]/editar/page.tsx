import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrade, toFormacao, toPlano } from "@/lib/converters";
import GradeFormPage from "../../GradeFormPage";

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

  const [planos, formacoes] = await Promise.all([
    prisma.planoFormativo.findMany({
      where: { OR: [{ organizacaoId: orgId }, { isGlobal: true }], status: { not: "arquivado" } },
      include: { eixos: { orderBy: { ordem: "asc" } }, retiros: true },
      orderBy: { nome: "asc" },
    }),
    prisma.formacao.findMany({
      where: { gradeId: id, OR: [{ organizacaoId: orgId }, { isGlobal: true }], deletedAt: null },
      orderBy: { numero: "asc" },
    }),
  ]);

  return (
    <GradeFormPage
      id={id}
      role={user.role ?? "formador_comunitario"}
      initialGrade={toGrade(grade)}
      initialFormacoes={formacoes.map(toFormacao)}
      initialPlanos={planos.map(toPlano)}
    />
  );
}
