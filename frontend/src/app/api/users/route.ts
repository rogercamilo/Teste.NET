import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUsers, countUsers, createUser, findByEmail, toPublic } from "@/lib/users-store";
import { sendWelcomeEmail } from "@/lib/email";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateUserSchema, parseBody } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import { canAddUser, notifyAvancadoLimitIfNeeded } from "@/lib/plan-limits";

import { isAdminOrAbove, SessionUser } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!isAdminOrAbove(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (!user.organizacaoId) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);

    if (!pagination) {
      const users = await listUsers(user.organizacaoId);
      return NextResponse.json(users.map(toPublic));
    }

    const [users, total] = await Promise.all([
      listUsers(user.organizacaoId, { skip: pagination.skip, take: pagination.take }),
      countUsers(user.organizacaoId),
    ]);
    return NextResponse.json(users.map(toPublic), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("users GET", err);
    return NextResponse.json({ error: "Falha ao carregar usuários" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;

  if (!actor) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!isAdminOrAbove(actor.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  if (!actor.organizacaoId) {
    return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
  }

  const rl = await limiters.mutation(actor.id ?? getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsed = parseBody(CreateUserSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { nome, email, password, perfil, grupoFormacaoId, ativo } = parsed.data;

    const limitCheck = await canAddUser(actor.organizacaoId);
    if (!limitCheck.allowed) {
      notifyAvancadoLimitIfNeeded(actor.organizacaoId, "usuarios");
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    if (await findByEmail(email, actor.organizacaoId)) {
      return NextResponse.json({ error: "E-mail já está em uso" }, { status: 409 });
    }

    const perfilSanitizado = perfil ?? "formador_comunitario";

    const { user, tempPassword } = await createUser({
      nome,
      email,
      password: password || undefined,
      perfil: perfilSanitizado as "administrador" | "formador_geral" | "formador_comunitario",
      grupoFormacaoId,
      ativo: ativo ?? true,
      organizacaoId: actor.organizacaoId,
    });

    let emailSent = false;
    if (tempPassword) {
      const result = await sendWelcomeEmail({ organizacaoId: actor.organizacaoId!, nome, email, tempPassword });
      emailSent = result.sent;
    }

    logAction("user_created", actor.id, getClientIp(request), { targetEmail: email, perfil: perfilSanitizado }, actor.organizacaoId);

    // tempPassword só existe quando a senha foi gerada automaticamente. É devolvido
    // (uma única vez) para que o admin possa repassá-lo ao novo usuário caso o
    // e-mail de boas-vindas não tenha sido enviado (SMTP ausente).
    return NextResponse.json({ ...toPublic(user), emailSent, tempPassword }, { status: 201 });
  } catch (err) {
    logError("users POST", err);
    return NextResponse.json({ error: "Falha ao criar usuário" }, { status: 500 });
  }
}
