import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { randomBytes } from "crypto";

export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") {
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
        select: { id: true, tipo: true, status: true, organizacaoId: true, usuarioId: true, solicitadoEm: true, processadoEm: true },
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
    logError("super-admin/lgpd GET", err);
    return NextResponse.json({ error: "Falha ao carregar dados LGPD" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  let body: { id?: string; status?: string };
  try {
    body = await request.json() as { id?: string; status?: string };
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido" }, { status: 400 });
  }
  const CUID_RE = /^c[a-z0-9]{20,30}$/;
  if (!body.id || !CUID_RE.test(body.id) || !["processando", "concluido"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  try {
    const req = await prisma.deletionRequest.findUnique({ where: { id: body.id } });
    if (!req) return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });

    // When concluding an org-level deletion: anonymize all user PII and mark org as cancelled
    if (body.status === "concluido" && req.tipo === "organizacao" && req.organizacaoId) {
      const orgId = req.organizacaoId;
      await prisma.$transaction(async (tx) => {
        // Process in batches to avoid transaction timeout on large orgs
        let cursor: string | undefined;
        do {
          const batch = await tx.usuario.findMany({
            where: { organizacaoId: orgId, deletedAt: null },
            select: { id: true },
            take: 200,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            orderBy: { id: "asc" },
          });
          if (batch.length === 0) break;
          await tx.usuario.updateMany({
            where: { id: { in: batch.map((u) => u.id) } },
            data: {
              nome: "Usuário Removido",
              passwordHash: null,
              ativo: false,
              deletedAt: new Date(),
            },
          });
          // Anonymize emails individually since each needs a unique random hash
          for (const u of batch) {
            const emailHash = randomBytes(8).toString("hex");
            await tx.usuario.update({
              where: { id: u.id },
              data: { email: `removido_${emailHash}@excluido.local` },
            });
          }
          cursor = batch[batch.length - 1].id;
          if (batch.length < 200) break;
        } while (true);
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
