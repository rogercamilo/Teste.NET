import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadEmailTemplate, saveEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from "@/lib/email-template";
import { logAction, getClientIp, logError } from "@/lib/audit-log";

type SU = { id?: string; role?: string; organizacaoId?: string };

function isAdminOrAbove(role: string | undefined): boolean {
  return role === "administrador" || role === "formador_geral";
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  return NextResponse.json(await loadEmailTemplate(user.organizacaoId));
}

export async function PUT(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const current = await loadEmailTemplate(user.organizacaoId);
    const updated = {
      assunto: typeof body.assunto === "string" ? body.assunto : current.assunto,
      saudacao: typeof body.saudacao === "string" ? body.saudacao : current.saudacao,
      mensagem1: typeof body.mensagem1 === "string" ? body.mensagem1 : current.mensagem1,
      mensagem2: typeof body.mensagem2 === "string" ? body.mensagem2 : current.mensagem2,
      passos: Array.isArray(body.passos) ? body.passos : current.passos,
      textoBotao: typeof body.textoBotao === "string" ? body.textoBotao : current.textoBotao,
      avisoSeguranca: typeof body.avisoSeguranca === "string" ? body.avisoSeguranca : current.avisoSeguranca,
      rodape: typeof body.rodape === "string" ? body.rodape : current.rodape,
    };
    await saveEmailTemplate(user.organizacaoId, updated);
    logAction("email_template_changed", user.id, getClientIp(request), {}, user.organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("email-template PUT", err);
    return NextResponse.json({ error: "Erro ao salvar template. Tente novamente." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  await saveEmailTemplate(user.organizacaoId, {
    ...DEFAULT_EMAIL_TEMPLATE,
    passos: [...DEFAULT_EMAIL_TEMPLATE.passos],
  });
  logAction("email_template_changed", user.id, getClientIp(request), { action: "reset" }, user.organizacaoId);
  return NextResponse.json({ ok: true });
}
