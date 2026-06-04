import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrade, toGrupoFormacao } from "@/lib/converters";
import GradesClient from "./GradesClient";

export default async function GradesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; organizacaoId?: string; grupoFormacaoId?: string | null };
  if (!user.organizacaoId) redirect("/login");

  const [gradesRaw, gruposFormacaoRaw] = await Promise.all([
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
    <GradesClient
      role={user.role ?? "formador_comunitario"}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
      initialGrades={gradesRaw.map(toGrade)}
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
    />
  );
}
