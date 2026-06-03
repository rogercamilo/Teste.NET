import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toMorada, toPlano, toGrade } from "@/lib/converters";
import type { Usuario } from "@/types";
import MoradasClient from "./MoradasClient";

export default async function MoradasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; organizacaoId?: string; moradaId?: string | null };

  if (user.role === "formador_comunitario" && user.moradaId) {
    redirect(`/moradas/${user.moradaId}`);
  }

  if (!user.organizacaoId) redirect("/login");

  const [moradasRaw, planosRaw, gradesRaw, formadoresRaw, formandoCountsRaw] = await Promise.all([
    prisma.morada.findMany({
      where: { organizacaoId: user.organizacaoId },
      orderBy: { nome: "asc" },
    }),
    prisma.planoFormativo.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: { eixos: { orderBy: { ordem: "asc" } }, retiros: { orderBy: { numero: "asc" } } },
      orderBy: { nome: "asc" },
    }),
    prisma.gradeFormativa.findMany({
      where: { organizacaoId: user.organizacaoId },
      include: { eixos: { include: { etapas: true } } },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: {
        organizacaoId: user.organizacaoId,
        perfil: { in: ["formador_comunitario", "formador_geral"] },
        ativo: true,
      },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, moradaId: true, criadoEm: true },
      orderBy: { nome: "asc" },
    }),
    prisma.formando.groupBy({
      by: ["moradaId"],
      where: { organizacaoId: user.organizacaoId, deletedAt: null },
      _count: { id: true },
    }),
  ]);

  const formandoCounts: Record<string, number> = {};
  for (const row of formandoCountsRaw) {
    if (row.moradaId) formandoCounts[row.moradaId] = row._count.id;
  }

  const formadores: Usuario[] = formadoresRaw.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil as Usuario["perfil"],
    ativo: u.ativo,
    moradaId: u.moradaId ?? undefined,
    criadoEm: u.criadoEm.toISOString(),
  }));

  return (
    <MoradasClient
      initialMoradas={moradasRaw.map(toMorada)}
      initialPlanos={planosRaw.map(toPlano)}
      initialGrades={gradesRaw.map(toGrade)}
      initialFormadores={formadores}
      formandoCounts={formandoCounts}
    />
  );
}
