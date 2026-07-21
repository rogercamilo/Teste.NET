import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrade, toFormacao, toPlano } from "@/lib/converters";
import { podeElaborarConteudo } from "@/types";
import GradeDetalheClient from "./GradeDetalheClient";

export default async function GradeDetalhePage({
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

  const [linkedFormacoes, plano] = await Promise.all([
    prisma.formacao.findMany({
      where: { gradeId: id, deletedAt: null, OR: [{ organizacaoId: orgId }, { isGlobal: true }] },
      orderBy: { numero: "asc" },
      include: {
        plano: { select: { nome: true } },
        grade: { select: { nome: true } },
        eixo: { select: { nome: true } },
      },
    }),
    grade.planoId
      ? prisma.planoFormativo.findFirst({
          where: { id: grade.planoId },
          include: { eixos: { orderBy: { ordem: "asc" } }, retiros: true },
        })
      : Promise.resolve(null),
  ]);

  const canEdit = podeElaborarConteudo(user.role);

  return (
    <GradeDetalheClient
      grade={toGrade(grade)}
      linkedFormacoes={linkedFormacoes.map(toFormacao)}
      plano={plano ? toPlano(plano) : null}
      canEdit={canEdit}
    />
  );
}
