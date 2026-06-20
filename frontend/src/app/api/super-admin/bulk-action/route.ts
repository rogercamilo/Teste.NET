import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { isValidId } from "@/lib/schemas";

type BulkAcao = "suspender" | "reativar" | "estender_trial";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await request.json() as {
      orgIds?: unknown;
      acao?: unknown;
      diasTrial?: unknown;
    };

    const orgIds = body.orgIds;
    const acao = body.acao as BulkAcao;
    const diasTrial = Number(body.diasTrial ?? 30);

    const validAcoes: BulkAcao[] = ["suspender", "reativar", "estender_trial"];
    if (!validAcoes.includes(acao)) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
    if (!Array.isArray(orgIds) || orgIds.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos uma organização." }, { status: 400 });
    }
    if (orgIds.length > 100) {
      return NextResponse.json({ error: "Máximo 100 organizações por vez." }, { status: 400 });
    }
    if (!(orgIds as unknown[]).every((id) => typeof id === "string" && isValidId(id))) {
      return NextResponse.json({ error: "IDs inválidos." }, { status: 400 });
    }
    if (acao === "estender_trial") {
      if (!Number.isInteger(diasTrial) || diasTrial < 1 || diasTrial > 365) {
        return NextResponse.json({ error: "diasTrial deve ser entre 1 e 365." }, { status: 400 });
      }
    }

    let success = 0;
    let failed = 0;

    for (const orgId of orgIds as string[]) {
      try {
        if (acao === "suspender") {
          await prisma.organizacao.update({
            where: { id: orgId },
            data: { status: "SUSPENSO" },
          });
        } else if (acao === "reativar") {
          await prisma.organizacao.update({
            where: { id: orgId },
            data: { status: "ATIVO", canceladoEm: null },
          });
        } else if (acao === "estender_trial") {
          const org = await prisma.organizacao.findUnique({ where: { id: orgId } });
          if (!org) { failed++; continue; }
          const base = org.trialExpiresAt && org.trialExpiresAt > new Date()
            ? org.trialExpiresAt
            : new Date();
          const newExpiry = new Date(base.getTime() + diasTrial * 24 * 60 * 60 * 1000);
          await prisma.organizacao.update({
            where: { id: orgId },
            data: {
              trialExpiresAt: newExpiry,
              status: org.status === "ATIVO" ? "TRIAL" : org.status,
            },
          });
        }
        success++;
      } catch {
        failed++;
      }
    }

    await logAction(
      "bulk_action_applied",
      user.id ?? undefined,
      getClientIp(request),
      { acao, orgCount: (orgIds as string[]).length, success, failed, diasTrial },
    );

    return NextResponse.json({ success, failed });
  } catch (err) {
    logError("super-admin/bulk-action POST", err);
    return NextResponse.json({ error: "Falha ao executar ação em massa" }, { status: 500 });
  }
}
