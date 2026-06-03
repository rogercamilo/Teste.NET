import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrade, toMorada } from "@/lib/converters";
import GradesClient from "./GradesClient";

export default async function GradesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; organizacaoId?: string; moradaId?: string | null };
  if (!user.organizacaoId) redirect("/login");

  const [gradesRaw, moradasRaw] = await Promise.all([
    prisma.gradeFormativa.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: { eixos: { include: { etapas: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.morada.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <GradesClient
      role={user.role ?? "formador_comunitario"}
      moradaId={user.moradaId ?? null}
      initialGrades={gradesRaw.map(toGrade)}
      initialMoradas={moradasRaw.map(toMorada)}
    />
  );
}
