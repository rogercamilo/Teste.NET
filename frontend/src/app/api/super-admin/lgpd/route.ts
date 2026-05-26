import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { createHash } from "crypto";

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

  try {
    const req = await prisma.deletionRequest.findUnique({ where: { id: body.id } });
    if (!req) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });

    // When concluding an org-level deletion: anonymize all user PII and mark org as cancelled
    if (body.status === "concluido" && req.tipo === "organizacao" && req.organizacaoId) {
      const orgId = req.organizacaoId;
      await prisma.$transaction(async (tx) => {
        const usuarios = await tx.usuario.findMany({
          where: { organizacaoId: orgId, deletedAt: null },
          select: { id: true, email: true },
        });
        for (const u of usuarios) {
          const emailHash = createHash("sha256").update(u.email).digest("hex").slice(0, 16);
          await tx.usuario.update({
            where: { id: u.id },
            data: {
              nome: "Usuário Removido",
              email: `removido_${emailHash}@excluido.local`,
              passwordHash: null,
              ativo: false,
              deletedAt: new Date(),
            },
          });
        }
        await tx.organizacao.update({
          where: { id: orgId },
          data: { status: "CANCELADO" },
        });
        await tx.deletionRequest.update({
          where: { id: body.id },
          data: { status: "concluido", processadoEm: new Date() },
        });
      });

      logAction("deletion_request_processed", user.id ?? undefined, getClientIp(request), {
        id: body.id, tipo: "organizacao", orgId, status: "concluido",
      });
      return NextResponse.json({ ok: true });
    }

    // Default: just update status (e.g., "processando" or non-org types)
    const updated = await prisma.deletionRequest.update({
      where: { id: body.id },
      data: {
        status: body.status,
        processadoEm: body.status === "concluido" ? new Date() : undefined,
      },
    });

    logAction("deletion_request_processed", user.id ?? undefined, getClientIp(request), {
      id: body.id, status: body.status,
    });
    return NextResponse.json(updated);
  } catch (err) {
    logError("super-admin/lgpd PATCH", err);
    return NextResponse.json({ error: "Falha ao processar solicitação" }, { status: 500 });
  }
}
