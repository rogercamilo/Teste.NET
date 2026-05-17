import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listUsers, createUser, findByEmail, toPublic } from "@/lib/users-store";
import { sendWelcomeEmail } from "@/lib/email";
import { logAction, getClientIp } from "@/lib/audit-log";

type SessionUser = { id?: string; role?: string; organizacaoId?: string };

function isAdminOrAbove(role: string | undefined): boolean {
  return role === "administrador" || role === "formador_geral";
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!isAdminOrAbove(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const users = await listUsers(user.organizacaoId);
    return NextResponse.json(users.map(toPublic));
  } catch {
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

  try {
    const body = await request.json() as {
      nome?: string;
      email?: string;
      password?: string;
      perfil?: string;
      moradaId?: string;
      ativo?: boolean;
    };
    const { nome, email, password, perfil, moradaId, ativo } = body;

    if (!nome || !email) {
      return NextResponse.json(
        { error: "Nome e e-mail são obrigatórios" },
        { status: 400 }
      );
    }
    if (await findByEmail(email, actor.organizacaoId)) {
      return NextResponse.json({ error: "E-mail já está em uso" }, { status: 409 });
    }

    // Impede criação de formador_geral via API — apenas super admin pode elevar a este nível
    const perfilSanitizado =
      perfil === "formador_geral" ? "administrador" : (perfil ?? "formador_comunitario");

    const { user, tempPassword } = await createUser({
      nome,
      email,
      password: password || undefined,
      perfil: perfilSanitizado as "administrador" | "formador_comunitario",
      moradaId,
      ativo: ativo ?? true,
      organizacaoId: actor.organizacaoId,
    });

    let emailSent = false;
    if (tempPassword) {
      const result = await sendWelcomeEmail({ nome, email, tempPassword });
      emailSent = result.sent;
    }

    logAction("user_created", actor.id, getClientIp(request), { targetEmail: email, perfil: perfilSanitizado }, actor.organizacaoId);

    return NextResponse.json({ ...toPublic(user), tempPassword, emailSent }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar usuário" }, { status: 500 });
  }
}
