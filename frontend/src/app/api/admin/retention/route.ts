/**
 * Rota de retenção de dados — executada via cron job externo (Railway / Vercel Cron).
 *
 * O chamador deve enviar o header:
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Ações realizadas:
 *  1. Exclui AuditLog com mais de 12 meses (hard delete automático — Política de Privacidade §8)
 *  2. Marca como "concluido" DeletionRequests pendentes com mais de 30 dias
 *     (dados já foram anonimizados imediatamente na rota /api/conta/excluir)
 *
 * Exemplo de chamada (Railway cron):
 *   GET https://app.formatio.app/api/admin/retention
 *   Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit-log";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Purga AuditLog > 12 meses
  const auditCutoff = new Date(now);
  auditCutoff.setMonth(auditCutoff.getMonth() - 12);

  const { count: auditDeleted } = await prisma.auditLog.deleteMany({
    where: { criadoEm: { lt: auditCutoff } },
  });

  // 2. Marca DeletionRequests "pendente" com mais de 30 dias como "concluido"
  //    (os dados já foram anonimizados imediatamente na solicitação — /api/conta/excluir)
  const deletionCutoff = new Date(now);
  deletionCutoff.setDate(deletionCutoff.getDate() - 30);

  const { count: deletionProcessed } = await prisma.deletionRequest.updateMany({
    where: {
      status: "pendente",
      solicitadoEm: { lt: deletionCutoff },
    },
    data: {
      status: "concluido",
      processadoEm: now,
    },
  });

  logAction(
    "audit_log_purged",
    undefined,
    undefined,
    { auditDeleted, cutoff: auditCutoff.toISOString() },
  );

  if (deletionProcessed > 0) {
    logAction(
      "deletion_request_processed",
      undefined,
      undefined,
      { count: deletionProcessed, cutoff: deletionCutoff.toISOString() },
    );
  }

  return NextResponse.json({
    ok: true,
    auditLogDeleted: auditDeleted,
    deletionRequestsProcessed: deletionProcessed,
    ranAt: now.toISOString(),
  });
}
