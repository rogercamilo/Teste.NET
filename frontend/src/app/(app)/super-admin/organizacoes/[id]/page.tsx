import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidId } from "@/lib/schemas";
import OrgDetailClient from "./OrgDetailClient";

type Params = { params: Promise<{ id: string }> };

export default async function OrgDetailPage({ params }: Params) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "super_admin") redirect("/dashboard");

  const { id } = await params;
  if (!isValidId(id)) redirect("/super-admin");

  const [org, logs, admins, formandosCount, gruposCount, usuariosCount] = await Promise.all([
    prisma.organizacao.findUnique({ where: { id } }),
    prisma.auditLog.findMany({
      where: { organizacaoId: id },
      orderBy: { criadoEm: "desc" },
      take: 50,
      select: {
        id: true,
        acao: true,
        ip: true,
        criadoEm: true,
        detalhes: true,
        usuario: { select: { nome: true, email: true } },
      },
    }),
    prisma.usuario.findMany({
      where: { organizacaoId: id, ativo: true, deletedAt: null },
      select: { id: true, nome: true, email: true, perfil: true, criadoEm: true },
      orderBy: [{ perfil: "asc" }, { nome: "asc" }],
    }),
    prisma.formando.count({ where: { organizacaoId: id } }),
    prisma.grupoFormacao.count({ where: { organizacaoId: id } }),
    prisma.usuario.count({ where: { organizacaoId: id, ativo: true, deletedAt: null } }),
  ]);

  if (!org) redirect("/super-admin");

  return (
    <OrgDetailClient
      org={org}
      logs={logs}
      admins={admins}
      stats={{ formandos: formandosCount, grupos: gruposCount, usuarios: usuariosCount }}
    />
  );
}
