import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  try {
    const [
      deletionRequests,
      deletionByStatus,
      privacyByTipo,
      cookieTotal,
      cookieAnaliticos,
    ] = await Promise.all([
      prisma.deletionRequest.findMany({
        orderBy: { solicitadoEm: "desc" },
        take: 50,
      }),
      prisma.deletionRequest.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.privacyAcceptance.groupBy({
        by: ["tipo", "versao"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.cookieConsent.count(),
      prisma.cookieConsent.count({ where: { analiticos: true } }),
    ]);

    const statsMap = Object.fromEntries(
      deletionByStatus.map((s) => [s.status, s._count.id])
    );

    return NextResponse.json({
      deletionRequests,
      deletionStats: {
        pendentes: statsMap["pendente"] ?? 0,
        processando: statsMap["processando"] ?? 0,
        concluidos: statsMap["concluido"] ?? 0,
      },
      privacyByTipo,
      cookieTotal,
      cookieAnaliticos,
    });
  } catch (err) {
    console.error("[super-admin/lgpd GET]", err);
    return NextResponse.json({ error: "Falha ao carregar dados LGPD" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json() as { id?: string; status?: string };
  if (!body.id || !["processando", "concluido"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const updated = await prisma.deletionRequest.update({
    where: { id: body.id },
    data: {
      status: body.status,
      processadoEm: body.status === "concluido" ? new Date() : undefined,
    },
  });

  logAction(
    "deletion_request_processed",
    user.id ?? undefined,
    getClientIp(request),
    { id: body.id, status: body.status }
  );

  return NextResponse.json(updated);
}
