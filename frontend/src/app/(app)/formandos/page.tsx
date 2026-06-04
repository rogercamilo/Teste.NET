import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormando, toGrupoFormacao, toGrade } from "@/lib/converters";
import FormandosClient from "./FormandosClient";

export default async function FormandosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as {
    role?: string;
    organizacaoId?: string;
    grupoFormacaoId?: string | null;
  };

  // FC always goes directly to their morada — redirect server-side (no flash)
  if (user.role === "formador_comunitario" && user.grupoFormacaoId) {
    redirect(`/grupos-formacao/${user.grupoFormacaoId}`);
  }

  if (!user.organizacaoId) redirect("/login");

  const [formandosRaw, gruposFormacaoRaw, gradesRaw] = await Promise.all([
    prisma.formando.findMany({
      where: { organizacaoId: user.organizacaoId, deletedAt: null },
      include: { progressoEtapas: true },
      orderBy: { nome: "asc" },
    }),
    prisma.grupoFormacao.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { nome: "asc" },
    }),
    prisma.gradeFormativa.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: { eixos: { include: { etapas: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <FormandosClient
      initialFormandos={formandosRaw.map(toFormando)}
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
      initialGrades={gradesRaw.map(toGrade)}
      role={user.role ?? "formador_comunitario"}
      grupoFormacaoId={user.grupoFormacaoId ?? null}
    />
  );
}
