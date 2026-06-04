import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormacao, toGrade, toGrupoFormacao } from "@/lib/converters";
import FormacoesClient from "./FormacoesClient";

export default async function FormacoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; organizacaoId?: string; grupoFormacaoId?: string | null };
  if (!user.organizacaoId) redirect("/login");

  const [formacoesRaw, gradesRaw, gruposFormacaoRaw] = await Promise.all([
    prisma.formacao.findMany({
      where: {
        OR: [
          { organizacaoId: user.organizacaoId },
          { isGlobal: true },
        ],
        deletedAt: null,
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.gradeFormativa.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: { eixos: { include: { etapas: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.grupoFormacao.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <FormacoesClient
      initialFormacoes={formacoesRaw.map(toFormacao)}
      initialGrades={gradesRaw.map(toGrade)}
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
      role={user.role ?? "formador_comunitario"}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
    />
  );
}
