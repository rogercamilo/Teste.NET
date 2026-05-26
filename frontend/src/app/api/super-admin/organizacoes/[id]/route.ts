import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { PlanoAssinatura, type StatusOrganizacao } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json() as {
      acao?: string;
      plano?: string;
      cortesiaExpiresAt?: string | null;
      cortesiaMotivo?: string;
    };
    const { acao, plano } = body;

    const validAcoes = ["suspender", "reativar", "cancelar", "cortesia", "revogar-cortesia"] as const;
    const validPlanos: PlanoAssinatura[] = ["GRATUITO", "ESSENCIAL", "PROFISSIONAL"];

    if (acao && !(validAcoes as readonly string[]).includes(acao)) {
      return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
    if (plano && !validPlanos.includes(plano as PlanoAssinatura)) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }
    if (acao && plano) {
      return NextResponse.json({ error: "Envie apenas 'acao' ou 'plano', não ambos" }, { status: 400 });
    }

    const org = await prisma.organizacao.findUnique({ where: { id } });
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    // ── Cortesia ─────────────────────────────────────────────────────────────
    if (acao === "cortesia") {
      const expiresAt = body.cortesiaExpiresAt ? new Date(body.cortesiaExpiresAt) : null;
      await prisma.organizacao.update({
        where: { id },
        data: {
          cortesia: true,
          cortesiaExpiresAt: expiresAt,
          cortesiaMotivo: body.cortesiaMotivo?.trim() ?? null,
          status: org.status === "SUSPENSO" || org.status === "CANCELADO" ? "ATIVO" : org.status,
        },
      });
      logAction("organizacao_cortesia_concedida", user.id ?? undefined, getClientIp(request),
        { orgId: id, expiresAt: expiresAt?.toISOString(), motivo: body.cortesiaMotivo }, id);
      return NextResponse.json({ ok: true });
    }

    if (acao === "revogar-cortesia") {
      await prisma.organizacao.update({
        where: { id },
        data: { cortesia: false, cortesiaExpiresAt: null, cortesiaMotivo: null },
      });
      logAction("organizacao_cortesia_revogada", user.id ?? undefined, getClientIp(request), { orgId: id }, id);
      return NextResponse.json({ ok: true });
    }

    // ── Status / Plano ────────────────────────────────────────────────────────
    let newStatus: StatusOrganizacao | undefined;
    let auditAction: "organizacao_suspended" | "organizacao_reactivated" | "organizacao_cancelada"
      | "organizacao_plan_changed" | "organizacao_updated" = "organizacao_updated";

    if (acao === "suspender") { newStatus = "SUSPENSO"; auditAction = "organizacao_suspended"; }
    else if (acao === "reativar") { newStatus = "ATIVO"; auditAction = "organizacao_reactivated"; }
    else if (acao === "cancelar") { newStatus = "CANCELADO"; auditAction = "organizacao_cancelada"; }
    if (plano) auditAction = "organizacao_plan_changed";

    const updated = await prisma.organizacao.update({
      where: { id },
      data: {
        ...(newStatus ? { status: newStatus } : {}),
        ...(plano ? { planoAssinatura: plano as PlanoAssinatura } : {}),
      },
    });

    logAction(auditAction, user.id ?? undefined, getClientIp(request), { orgId: id, acao, plano }, id);

    return NextResponse.json({ id: updated.id, status: updated.status, planoAssinatura: updated.planoAssinatura });
  } catch (err) {
    logError("", err);
    return NextResponse.json({ error: "Falha ao atualizar organização" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const org = await prisma.organizacao.findUnique({ where: { id } });
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    await prisma.deletionRequest.create({
      data: { organizacaoId: id, tipo: "organizacao", status: "concluido", processadoEm: new Date() },
    });
    await prisma.organizacao.delete({ where: { id } });

    logAction("organizacao_deleted", user.id ?? undefined, getClientIp(request), { orgId: id, nome: org.nome });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    logError("", err);
    return NextResponse.json({ error: "Falha ao excluir organização" }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  const [org, logs] = await Promise.all([
    prisma.organizacao.findUnique({ where: { id } }),
    prisma.auditLog.findMany({
      where: { organizacaoId: id },
      orderBy: { criadoEm: "desc" },
      take: 50,
      select: {
        acao: true, ip: true, criadoEm: true, detalhes: true,
        usuario: { select: { nome: true, email: true } },
      },
    }),
  ]);

  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  return NextResponse.json({ org, logs });
}
