import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendComunicadoEmail } from "@/lib/email";
import { logAction, getClientIp, logError } from "@/lib/audit-log";

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await request.json() as {
      assunto?: string;
      mensagem?: string;
      filtros?: { status?: string[]; plano?: string[] };
      orgIds?: string[];
    };

    const { assunto, mensagem, filtros, orgIds } = body;

    if (!assunto?.trim() || !mensagem?.trim()) {
      return NextResponse.json({ error: "Assunto e mensagem são obrigatórios." }, { status: 400 });
    }

    // Build org WHERE based on audience
    const orgWhere: Record<string, unknown> = {};
    if (orgIds?.length) {
      orgWhere.id = { in: orgIds };
    } else if (filtros) {
      if (filtros.status?.length) orgWhere.status = { in: filtros.status };
      if (filtros.plano?.length) orgWhere.planoAssinatura = { in: filtros.plano };
    }

    const orgs = await prisma.organizacao.findMany({
      where: orgWhere,
      select: { id: true, nome: true },
    });

    if (orgs.length === 0) {
      return NextResponse.json({ orgs: 0, admins: 0, sent: 0, failed: 0 });
    }

    const admins = await prisma.usuario.findMany({
      where: {
        organizacaoId: { in: orgs.map((o) => o.id) },
        perfil: { in: ["administrador", "formador_geral"] },
        ativo: true,
        deletedAt: null,
      },
      select: { nome: true, email: true, organizacaoId: true },
    });

    const orgMap = new Map(orgs.map((o) => [o.id, o.nome]));

    let sent = 0;
    let failed = 0;

    for (const admin of admins) {
      const orgNome = orgMap.get(admin.organizacaoId) ?? "Formattio";
      const result = await sendComunicadoEmail({
        organizacaoId: admin.organizacaoId,
        to: admin.email,
        nome: admin.nome,
        assunto: assunto.trim(),
        mensagem: mensagem.trim(),
        orgNome,
      });
      if (result.sent) sent++;
      else failed++;
    }

    await logAction(
      "comunicado_sent",
      user.id ?? undefined,
      getClientIp(request),
      { assunto: assunto.trim(), orgs: orgs.length, admins: admins.length, sent, failed },
    );

    return NextResponse.json({ orgs: orgs.length, admins: admins.length, sent, failed });
  } catch (err) {
    logError("super-admin/comunicado POST", err);
    return NextResponse.json({ error: "Falha ao enviar comunicado" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "super_admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const url = new URL(request.url);
  const orgIds = url.searchParams.get("orgIds")?.split(",").filter(Boolean) ?? [];
  const status = url.searchParams.get("status")?.split(",").filter(Boolean) ?? [];
  const plano = url.searchParams.get("plano")?.split(",").filter(Boolean) ?? [];

  try {
    const orgWhere: Record<string, unknown> = {};
    if (orgIds.length) {
      orgWhere.id = { in: orgIds };
    } else {
      if (status.length) orgWhere.status = { in: status };
      if (plano.length) orgWhere.planoAssinatura = { in: plano };
    }

    const count = await prisma.usuario.count({
      where: {
        organizacao: orgWhere,
        perfil: { in: ["administrador", "formador_geral"] },
        ativo: true,
        deletedAt: null,
      },
    });

    const orgCount = await prisma.organizacao.count({ where: orgWhere });

    return NextResponse.json({ orgs: orgCount, admins: count });
  } catch (err) {
    logError("super-admin/comunicado GET", err);
    return NextResponse.json({ error: "Falha ao calcular audiência" }, { status: 500 });
  }
}
