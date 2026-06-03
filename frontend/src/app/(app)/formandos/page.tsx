import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toFormando, toMorada, toGrade } from "@/lib/converters";
import FormandosClient from "./FormandosClient";

export default async function FormandosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as {
    role?: string;
    organizacaoId?: string;
    moradaId?: string | null;
  };

  // FC always goes directly to their morada — redirect server-side (no flash)
  if (user.role === "formador_comunitario" && user.moradaId) {
    redirect(`/moradas/${user.moradaId}`);
  }

  if (!user.organizacaoId) redirect("/login");

  const [formandosRaw, moradasRaw, gradesRaw] = await Promise.all([
    prisma.formando.findMany({
      where: { organizacaoId: user.organizacaoId, deletedAt: null },
      include: { progressoEtapas: true },
      orderBy: { nome: "asc" },
    }),
    prisma.morada.findMany({
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
      initialMoradas={moradasRaw.map(toMorada)}
      initialGrades={gradesRaw.map(toGrade)}
      role={user.role ?? "formador_comunitario"}
      moradaId={user.moradaId ?? null}
    />
  );
}
