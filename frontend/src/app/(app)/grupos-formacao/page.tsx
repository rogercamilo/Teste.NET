import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toGrupoFormacao, toPlano, toGrade } from "@/lib/converters";
import type { Usuario } from "@/types";
import GruposFormacaoClient from "./GruposFormacaoClient";

export default async function MoradasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { role?: string; organizacaoId?: string; grupoFormacaoId?: string | null };

  if (user.role === "formador_comunitario" && user.grupoFormacaoId) {
    redirect(`/grupos-formacao/${user.grupoFormacaoId}`);
  }

  if (!user.organizacaoId) redirect("/login");

  const [gruposFormacaoRaw, planosRaw, gradesRaw, formadoresRaw, formandoCountsRaw] = await Promise.all([
    prisma.grupoFormacao.findMany({
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
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, grupoFormacaoId: true, criadoEm: true },
      orderBy: { nome: "asc" },
    }),
    prisma.formando.groupBy({
      by: ["grupoFormacaoId"],
      where: { organizacaoId: user.organizacaoId, deletedAt: null },
      _count: { id: true },
    }),
  ]);

  const formandoCounts: Record<string, number> = {};
  for (const row of formandoCountsRaw) {
    if (row.grupoFormacaoId) formandoCounts[row.grupoFormacaoId] = row._count.id;
  }

  const formadores: Usuario[] = formadoresRaw.map((u) => ({
    id: u.id,
    nome: u.nome,
    email: u.email,
    perfil: u.perfil as Usuario["perfil"],
    ativo: u.ativo,
    grupoFormacaoId: u.grupoFormacaoId ?? undefined,
    criadoEm: u.criadoEm.toISOString(),
  }));

  return (
    <GruposFormacaoClient
      initialGruposFormacao={gruposFormacaoRaw.map(toGrupoFormacao)}
      initialPlanos={planosRaw.map(toPlano)}
      initialGrades={gradesRaw.map(toGrade)}
      initialFormadores={formadores}
      formandoCounts={formandoCounts}
    />
  );
}
