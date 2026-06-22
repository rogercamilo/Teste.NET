import { NextResponse } from "next/server";
import { logError } from "@/lib/audit-log";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // Saúde do pool de conexões do PostgreSQL. Isolado num try/catch próprio para que uma
    // falha aqui (permissão, versão) não derrube todo o painel de infraestrutura.
    let conexoes:
      | { total: number; ativas: number; ociosas: number; max: number; percentUso: number }
      | null = null;
    try {
      const rows = await prisma.$queryRaw<
        { max: number; total: number; ativas: number; ociosas: number }[]
      >`
        SELECT
          current_setting('max_connections')::int AS max,
          count(*)::int AS total,
          count(*) FILTER (WHERE state = 'active')::int AS ativas,
          count(*) FILTER (WHERE state = 'idle')::int AS ociosas
        FROM pg_stat_activity
        WHERE backend_type = 'client backend'
      `;
      const r = rows[0];
      if (r) {
        conexoes = {
          total: r.total,
          ativas: r.ativas,
          ociosas: r.ociosas,
          max: r.max,
          percentUso: r.max > 0 ? Math.round((r.total / r.max) * 100) : 0,
        };
      }
    } catch (err) {
      logError("super-admin/servicos/conexoes", err);
    }

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
