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

  const inicio7d = new Date(Date.now() - 7 * 86_400_000);

  const [
    org,
    logs,
    admins,
    formandosCount,
    gruposCount,
    usuariosCount,
    formandosPorNivel,
    storageResult,
    presencasTotal,
    presencasPresentes,
    smtpCfg,
    lastActivity,
    engajamento7d,
  ] = await Promise.all([
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
    prisma.formando.groupBy({
      by: ["nivelFormativo"],
      where: { organizacaoId: id },
      _count: { id: true },
      orderBy: { nivelFormativo: "asc" },
    }),
    prisma.arquivo.aggregate({ where: { organizacaoId: id }, _sum: { tamanho: true } }),
    prisma.presencaFormacao.count({ where: { organizacaoId: id } }),
    prisma.presencaFormacao.count({ where: { organizacaoId: id, presente: true } }),
    prisma.configuracaoOrg.findUnique({
      where: { organizacaoId: id },
      select: { smtpConfig: true },
    }),
    prisma.auditLog.findFirst({
      where: { organizacaoId: id },
      orderBy: { criadoEm: "desc" },
      select: { criadoEm: true },
    }),
    prisma.auditLog.count({ where: { organizacaoId: id, criadoEm: { gte: inicio7d } } }),
  ]);

  if (!org) redirect("/super-admin");

  const smtpCfgData = smtpCfg?.smtpConfig as Record<string, string> | null | undefined;
  const smtpConfigured = !!(smtpCfgData?.host && smtpCfgData?.user);

  return (
    <OrgDetailClient
      org={org}
      logs={logs}
      admins={admins}
      stats={{ formandos: formandosCount, grupos: gruposCount, usuarios: usuariosCount }}
      formandosPorNivel={formandosPorNivel}
      storageBytes={storageResult._sum.tamanho ?? 0}
      presencasTotal={presencasTotal}
      presencasPresentes={presencasPresentes}
      smtpConfigured={smtpConfigured}
      lastActivityAt={lastActivity?.criadoEm ?? null}
      engajamento7d={engajamento7d}
    />
  );
}
