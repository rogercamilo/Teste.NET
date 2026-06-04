import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateConviteSchema, parseBody } from "@/lib/schemas";
import type { PerfilUsuario } from "@prisma/client";

import { isAdminOrAbove, SessionUser as SU } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const where = { organizacaoId: user.organizacaoId };
  const orderBy = { criadoEm: "desc" as const };
  const select = {
    id: true, email: true, nome: true, perfil: true, grupoFormacaoId: true,
    expiresAt: true, aceitoEm: true, criadoEm: true,
    criadoPor: { select: { nome: true } },
  };

  if (!pagination) {
    const convites = await prisma.conviteUsuario.findMany({ where, orderBy, select });
    return NextResponse.json(convites);
  }

  const [convites, total] = await Promise.all([
    prisma.conviteUsuario.findMany({ where, orderBy, select, skip: pagination.skip, take: pagination.take }),
    prisma.conviteUsuario.count({ where }),
  ]);
  return NextResponse.json(convites, { headers: paginationHeaders(total, pagination) });
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.email(user.id ?? getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Limite de convites atingido. Aguarde antes de enviar mais." }, { status: 429 });
  }

  try {
    const parsed = parseBody(CreateConviteSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { email, nome, grupoFormacaoId } = parsed.data;
    // Administradores de organização só podem convidar formador_comunitario ou administrador
    const perfil = parsed.data.perfil === "formador_geral" ? "administrador" : parsed.data.perfil;

    // Verificar se já existe usuário com esse e-mail
    const existing = await prisma.usuario.findFirst({
      where: { email: { equals: email.toLowerCase().trim(), mode: "insensitive" }, organizacaoId: user.organizacaoId },
    });
    if (existing) {
      return NextResponse.json({ error: "Já existe um usuário com este e-mail" }, { status: 409 });
    }

    // Verificar se há convite pendente
    const pendingInvite = await prisma.conviteUsuario.findFirst({
      where: {
        email: { equals: email.toLowerCase().trim(), mode: "insensitive" },
        organizacaoId: user.organizacaoId,
        aceitoEm: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (pendingInvite) {
      return NextResponse.json({ error: "Já existe um convite pendente para este e-mail" }, { status: 409 });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    if (grupoFormacaoId) {
      const grupoFormacao = await prisma.grupoFormacao.findFirst({
        where: { id: grupoFormacaoId, organizacaoId: user.organizacaoId },
      });
      if (!grupoFormacao) return NextResponse.json({ error: "Grupo de formação não encontrado" }, { status: 404 });
    }

    const convite = await prisma.conviteUsuario.create({
      data: {
        organizacaoId: user.organizacaoId,
        email: email.toLowerCase().trim(),
        nome: nome.trim(),
        perfil: perfil as PerfilUsuario,
        grupoFormacaoId: grupoFormacaoId || null,
        expiresAt,
        criadoPorId: user.id!,
      },
    });

    const org = await prisma.organizacao.findUnique({
      where: { id: user.organizacaoId },
      select: { nome: true },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/convite/${convite.token}`;

    const emailResult = await sendInviteEmail({
      organizacaoId: user.organizacaoId!,
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      inviteUrl,
      orgNome: org?.nome ?? "Formattio",
    });

    logAction(
      "convite_criado",
      user.id,
      getClientIp(request),
      { targetEmail: email, perfil, emailSent: emailResult.sent },
      user.organizacaoId
    );

    return NextResponse.json(
      { id: convite.id, emailSent: emailResult.sent },
      { status: 201 }
    );
  } catch (err) {
    logError("convites POST", err);
    return NextResponse.json({ error: "Falha ao criar convite" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const convite = await prisma.conviteUsuario.findFirst({
    where: { id, organizacaoId: user.organizacaoId },
  });
  if (!convite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

  await prisma.conviteUsuario.delete({ where: { id } });
  logAction("convite_cancelado", user.id, getClientIp(request), { conviteId: id }, user.organizacaoId);
  return NextResponse.json({ ok: true });
}
