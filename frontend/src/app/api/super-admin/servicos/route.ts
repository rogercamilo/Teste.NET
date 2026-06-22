import { NextResponse } from "next/server";
import { logError } from "@/lib/audit-log";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDbConnectionStats } from "@/lib/db-health";

export async function GET() {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [
      storageAggregate,
      topOrgsStorage,
      formandosCount,
      gruposFormacaoCount,
      usuariosCount,
      agendamentosCount,
      presencasCount,
      formacoesCount,
      auditLogsCount,
      arquivosCount,
      recentUploads,
      smtpOwnResult,
      totalOrgsCount,
      pushTotal,
      pushByOrg,
    ] = await Promise.all([
      prisma.arquivo.aggregate({ _count: { id: true }, _sum: { tamanho: true } }),
      prisma.arquivo.groupBy({
        by: ["organizacaoId"],
        _sum: { tamanho: true },
        _count: { id: true },
        orderBy: { _sum: { tamanho: "desc" } },
        take: 5,
      }),
      prisma.formando.count(),
      prisma.grupoFormacao.count(),
      prisma.usuario.count({ where: { deletedAt: null } }),
      prisma.agendamento.count(),
      prisma.presencaFormacao.count(),
      prisma.formacao.count(),
      prisma.auditLog.count(),
      prisma.arquivo.count(),
      prisma.arquivo.findMany({
        orderBy: { criadoEm: "desc" },
        take: 8,
        select: {
          id: true,
          nome: true,
          tamanho: true,
          tipo: true,
          uploadedByNome: true,
          criadoEm: true,
          organizacao: { select: { nome: true } },
        },
      }),
      prisma.$queryRaw<[{ c: bigint }]>`SELECT COUNT(*) as c FROM "ConfiguracaoOrg" WHERE "smtpConfig" IS NOT NULL`,
      prisma.organizacao.count(),
      prisma.pushSubscription.count(),
      prisma.pushSubscription.groupBy({
        by: ["organizacaoId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    const agora = new Date();
    const storageTrend = await Promise.all(
      [4, 3, 2, 1, 0].map(async (weeksAgo) => {
        const cutoff = new Date(agora.getTime() - weeksAgo * 7 * 86_400_000);
        const agg = await prisma.arquivo.aggregate({
          _sum: { tamanho: true },
          where: { criadoEm: { lte: cutoff } },
        });
        return {
          label: cutoff.toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
          bytes: agg._sum.tamanho ?? 0,
        };
      })
    );

    const storageOrgIds = topOrgsStorage.map((o) => o.organizacaoId);
    const pushOrgIds = pushByOrg.map((p) => p.organizacaoId);
    const allOrgIds = [...new Set([...storageOrgIds, ...pushOrgIds])];
    const orgNames =
      allOrgIds.length > 0
        ? await prisma.organizacao.findMany({
            where: { id: { in: allOrgIds } },
            select: { id: true, nome: true },
          })
        : [];
    const orgNomeMap = Object.fromEntries(orgNames.map((o) => [o.id, o.nome]));

    // Saúde do pool de conexões do PostgreSQL (helper compartilhado com o cron de alerta).
    // Retorna null se a query falhar, sem derrubar o painel de infraestrutura.
    const conexoes = await getDbConnectionStats();

    const totalBytes = storageAggregate._sum.tamanho ?? 0;
    const hasR2 = !!(process.env.R2_BUCKET_NAME && process.env.R2_ACCOUNT_ID);

    return NextResponse.json({
      storage: {
        provider: hasR2 ? "r2" : "local",
        totalArquivos: storageAggregate._count.id,
        totalBytes,
        totalMB: Math.round((totalBytes / (1024 * 1024)) * 10) / 10,
      },
      topOrgsStorage: topOrgsStorage.map((o) => ({
        organizacaoId: o.organizacaoId,
        nome: orgNomeMap[o.organizacaoId] ?? "—",
        arquivos: o._count.id,
        bytes: o._sum.tamanho ?? 0,
        mb: Math.round(((o._sum.tamanho ?? 0) / (1024 * 1024)) * 10) / 10,
      })),
      comunicacao: {
        smtpOwnCount: Number(smtpOwnResult[0]?.c ?? 0),
        totalOrgs: totalOrgsCount,
        pushTotal,
        topOrgsPush: pushByOrg.map((p) => ({
          organizacaoId: p.organizacaoId,
          nome: orgNomeMap[p.organizacaoId] ?? "—",
          count: p._count.id,
        })),
      },
      storageTrend,
      db: {
        formandos: formandosCount,
        gruposFormacao: gruposFormacaoCount,
        usuarios: usuariosCount,
        agendamentos: agendamentosCount,
        presencas: presencasCount,
        formacoes: formacoesCount,
        auditLogs: auditLogsCount,
        arquivos: arquivosCount,
      },
      conexoes,
      recentUploads: recentUploads.map((a) => ({
        id: a.id,
        nome: a.nome,
        tamanho: a.tamanho,
        tipo: a.tipo,
        uploadedByNome: a.uploadedByNome,
        criadoEm: a.criadoEm,
        orgNome: a.organizacao?.nome ?? "—",
      })),
    });
  } catch (err) {
    logError("super-admin/servicos", err);
    return NextResponse.json({ error: "Falha ao carregar dados de serviços" }, { status: 500 });
  }
}
