import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateConviteSchema, parseJson } from "@/lib/schemas";
import { findByEmailGlobal } from "@/lib/users-store";
import type { PerfilUsuario } from "@prisma/client";

import { isAdminOrAbove, podeGerenciarGestao, SessionUser as SU } from "@/lib/auth-helpers";

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

  try {
    if (!pagination) {
      const convites = await prisma.conviteUsuario.findMany({ where, orderBy, select });
      return NextResponse.json(convites);
    }

    const [convites, total] = await Promise.all([
      prisma.conviteUsuario.findMany({ where, orderBy, select, skip: pagination.skip, take: pagination.take }),
      prisma.conviteUsuario.count({ where }),
    ]);
    return NextResponse.json(convites, { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("convites GET", err);
    return NextResponse.json({ error: "Falha ao carregar convites" }, { status: 500 });
  }
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
    const parsed = await parseJson(request, CreateConviteSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { email, nome, grupoFormacaoId, perfil } = parsed.data;
    // Formador Geral é criado por cadastro direto (Admin), não por convite.
    if (perfil === "formador_geral") {
      return NextResponse.json({ error: "Formador Geral é criado pelo cadastro direto, não por convite." }, { status: 400 });
    }
    // Fecha a escalada: só administrador/super_admin pode convidar administradores —
    // sem isto, um formador_geral (isAdminOrAbove) podia convidar alguém como Admin.
    if (perfil === "administrador" && !podeGerenciarGestao(user.role)) {
      return NextResponse.json({ error: "Sem permissão para convidar administradores" }, { status: 403 });
    }

    // Invariante multi-tenant: 1 e-mail = 1 organização. Checagem GLOBAL (não por-org):
    // não se pode convidar um e-mail que já pertence a um usuário ativo em qualquer org.
    // Mensagem genérica de propósito (não revela a org onde o e-mail existe).
    const existing = await findByEmailGlobal(email.toLowerCase().trim());
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

    // Generate raw token (sent in email) and store only its SHA-256 hash in the DB.
    // A compromised database does not expose usable invite tokens.
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await prisma.conviteUsuario.create({
      data: {
        organizacaoId: user.organizacaoId,
        email: email.toLowerCase().trim(),
        nome: nome.trim(),
        perfil: perfil as PerfilUsuario,
        grupoFormacaoId: grupoFormacaoId || null,
        token: tokenHash,
        expiresAt,
        criadoPorId: user.id!,
      },
    });

    const org = await prisma.organizacao.findUnique({
      where: { id: user.organizacaoId },
      select: { nome: true },
    });

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${appUrl}/convite/${rawToken}`;

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
      { emailSent: emailResult.sent },
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

  try {
    const convite = await prisma.conviteUsuario.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
    });
    if (!convite) return NextResponse.json({ error: "Convite não encontrado" }, { status: 404 });

    await prisma.conviteUsuario.delete({ where: { id } });
    logAction("convite_cancelado", user.id, getClientIp(request), { conviteId: id }, user.organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("convites DELETE", err);
    return NextResponse.json({ error: "Falha ao cancelar convite" }, { status: 500 });
  }
}
