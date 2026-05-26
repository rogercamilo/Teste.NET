import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const agora = new Date();
    const inicio7d = new Date(agora);
    inicio7d.setDate(agora.getDate() - 7);
    const inicio24h = new Date(agora);
    inicio24h.setHours(agora.getHours() - 24);

    const [
      recentLogs,
      topAcoes7d,
      deletionPendentes,
      recentDeletions,
      privacyCount7d,
      logsCount24h,
    ] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { criadoEm: "desc" },
        take: 50,
        select: {
          id: true,
          acao: true,
          ip: true,
          criadoEm: true,
          detalhes: true,
          organizacao: { select: { nome: true } },
          usuario: { select: { nome: true, email: true } },
        },
      }),
      prisma.auditLog.groupBy({
        by: ["acao"],
        _count: { id: true },
        where: { criadoEm: { gte: inicio7d } },
        orderBy: { _count: { id: "desc" } },
        take: 8,
      }),
      prisma.deletionRequest.count({ where: { status: "pendente" } }),
      prisma.deletionRequest.findMany({
        orderBy: { solicitadoEm: "desc" },
        take: 15,
      }),
      prisma.privacyAcceptance.count({ where: { criadoEm: { gte: inicio7d } } }),
      prisma.auditLog.count({ where: { criadoEm: { gte: inicio24h } } }),
    ]);

    return NextResponse.json({
      recentLogs,
      topAcoes7d,
      deletionPendentes,
      recentDeletions,
      privacyCount7d,
      logsCount24h,
    });
  } catch (err) {
    logError("super-admin/seguranca GET", err);
    return NextResponse.json({ error: "Falha ao carregar dados de segurança" }, { status: 500 });
  }
}
