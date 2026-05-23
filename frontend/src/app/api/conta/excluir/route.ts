import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import { sendAccountDeletionEmail } from "@/lib/email";
import { createHash } from "crypto";

type SessionUser = { id?: string; email?: string; organizacaoId?: string; role?: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;
  if (!actor?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // super_admin não pode autoexcluir pela plataforma
  if (actor.role === "super_admin") {
    return NextResponse.json({ error: "Super admins não podem excluir a própria conta por aqui" }, { status: 403 });
  }

  const body = await req.json() as { emailConfirmacao?: string };
  if (!body.emailConfirmacao) {
    return NextResponse.json({ error: "Confirmação de e-mail obrigatória" }, { status: 400 });
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: actor.id } });
  if (!usuario) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  if (body.emailConfirmacao.toLowerCase().trim() !== usuario.email.toLowerCase()) {
    return NextResponse.json({ error: "E-mail de confirmação não confere" }, { status: 400 });
  }

  // Registra solicitação de exclusão antes de anonimizar
  await prisma.deletionRequest.create({
    data: {
      usuarioId: actor.id,
      organizacaoId: actor.organizacaoId ?? null,
      tipo: "usuario",
      status: "concluido",
      processadoEm: new Date(),
    },
  });

  // Soft delete: anonimiza PII e desativa conta
  const emailHash = createHash("sha256").update(usuario.email).digest("hex").slice(0, 16);
  await prisma.usuario.update({
    where: { id: actor.id },
    data: {
      nome: "Usuário Removido",
      email: `removido_${emailHash}@excluido.local`,
      passwordHash: null,
      ativo: false,
      deletedAt: new Date(),
    },
  });

  // Audit log mantido mesmo após exclusão
  await logAction("account_deleted", actor.id, getClientIp(req), { motivo: "solicitacao_usuario" }, actor.organizacaoId);

  // E-mail de confirmação (best-effort — não bloqueia resposta)
  sendAccountDeletionEmail({
    organizacaoId: actor.organizacaoId ?? "",
    nome: usuario.nome,
    email: usuario.email,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
