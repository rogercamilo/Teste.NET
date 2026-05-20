import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { PlanoAssinatura, StatusOrganizacao } from "@prisma/client";

type SU = { id?: string; role?: string };
type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (user?.role !== "super_admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json() as {
      acao?: "suspender" | "reativar" | "cancelar";
      plano?: PlanoAssinatura;
    };
    const { acao, plano } = body;

    const org = await prisma.organizacao.findUnique({ where: { id } });
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    let newStatus: StatusOrganizacao | undefined;
    let auditAction: "organizacao_suspended" | "organizacao_reactivated" | "organizacao_plan_changed" | "organizacao_updated" = "organizacao_updated";

    if (acao === "suspender") {
      newStatus = "SUSPENSO";
      auditAction = "organizacao_suspended";
    } else if (acao === "reativar") {
      newStatus = "ATIVO";
      auditAction = "organizacao_reactivated";
    } else if (acao === "cancelar") {
      newStatus = "CANCELADO";
      auditAction = "organizacao_suspended";
    }

    if (plano) auditAction = "organizacao_plan_changed";

    const updated = await prisma.organizacao.update({
      where: { id },
      data: {
        ...(newStatus ? { status: newStatus } : {}),
        ...(plano ? { planoAssinatura: plano } : {}),
      },
    });

    logAction(auditAction, user.id, getClientIp(request), { orgId: id, acao, plano }, id);

    return NextResponse.json({ id: updated.id, status: updated.status, planoAssinatura: updated.planoAssinatura });
  } catch (err) {
    console.error("[super-admin/org] Erro:", err);
    return NextResponse.json({ error: "Falha ao atualizar organização" }, { status: 500 });
  }
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
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
      select: { acao: true, ip: true, criadoEm: true, detalhes: true, usuario: { select: { nome: true, email: true } } },
    }),
  ]);

  if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

  return NextResponse.json({ org, logs });
}
