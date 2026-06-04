import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { toPlano } from "@/lib/converters";
import GradeFormPage from "../GradeFormPage";
import type { PerfilUsuario, Usuario } from "@/types";

export default async function NovaGradePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = session.user as { organizacaoId?: string; role?: string };
  if (!user.organizacaoId) redirect("/login");
  const orgId = user.organizacaoId;

  const [planos, usuarios] = await Promise.all([
    prisma.planoFormativo.findMany({
      where: { OR: [{ organizacaoId: orgId }, { isGlobal: true }], status: { not: "arquivado" } },
      include: { eixos: { orderBy: { ordem: "asc" } }, retiros: true },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: { organizacaoId: orgId, ativo: true, deletedAt: null },
      orderBy: { nome: "asc" },
    }),
  ]);

  const initialUsuarios: Usuario[] = usuarios.map((u) => ({
    id: u.id, nome: u.nome, email: u.email,
    perfil: u.perfil as PerfilUsuario,
    ativo: u.ativo, criadoEm: u.criadoEm.toISOString(),
  }));

  return (
    <GradeFormPage
      role={user.role ?? "formador_comunitario"}
      initialPlanos={planos.map(toPlano)}
      initialUsuarios={initialUsuarios}
    />
  );
}
