import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { PerfilUsuario } from "@prisma/client";

type SU = { id?: string; role?: string; organizacaoId?: string };

function isAdminOrAbove(role?: string) {
  return role === "administrador" || role === "formador_geral" || role === "super_admin";
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const convites = await prisma.conviteUsuario.findMany({
    where: { organizacaoId: user.organizacaoId },
    orderBy: { criadoEm: "desc" },
    select: {
      id: true, email: true, nome: true, perfil: true, moradaId: true,
      expiresAt: true, aceitoEm: true, criadoEm: true,
      criadoPor: { select: { nome: true } },
    },
  });

  return NextResponse.json(convites);
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json() as {
      email?: string;
      nome?: string;
      perfil?: string;
      moradaId?: string;
    };

    const { email, nome, perfil, moradaId } = body;
    if (!email?.trim() || !nome?.trim()) {
      return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
    }

    const perfilSanitizado =
      perfil === "super_admin" || perfil === "formador_geral" ? "administrador" : (perfil ?? "formador_comunitario");

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

    const convite = await prisma.conviteUsuario.create({
      data: {
        organizacaoId: user.organizacaoId,
        email: email.toLowerCase().trim(),
        nome: nome.trim(),
        perfil: perfilSanitizado as PerfilUsuario,
        moradaId: moradaId || null,
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
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      inviteUrl,
      orgNome: org?.nome ?? "Plataforma Formativa",
    });

    logAction(
      "convite_criado",
      user.id,
      getClientIp(request),
      { targetEmail: email, perfil: perfilSanitizado, emailSent: emailResult.sent },
      user.organizacaoId
    );

    return NextResponse.json(
      { id: convite.id, token: convite.token, emailSent: emailResult.sent, inviteUrl },
      { status: 201 }
    );
  } catch (err) {
    console.error("[convites] Erro:", err);
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
  return NextResponse.json({ ok: true });
}
