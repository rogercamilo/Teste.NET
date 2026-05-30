import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadEmailTemplate, saveEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from "@/lib/email-template";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { EmailTemplateSchema, parseBody } from "@/lib/schemas";

import { isAdmin as isAdminOrAbove, SessionUser as SU } from "@/lib/auth-helpers";

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
  const rlPut = await limiters.mutation(user.id ?? "unknown");
  if (!rlPut.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  try {
    const parsed = parseBody(EmailTemplateSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;
    const current = await loadEmailTemplate(user.organizacaoId);
    const updated = {
      assunto: body.assunto ?? current.assunto,
      saudacao: body.saudacao ?? current.saudacao,
      mensagem1: body.mensagem1 ?? current.mensagem1,
      mensagem2: body.mensagem2 ?? current.mensagem2,
      passos: body.passos ?? current.passos,
      textoBotao: body.textoBotao ?? current.textoBotao,
      avisoSeguranca: body.avisoSeguranca ?? current.avisoSeguranca,
      rodape: body.rodape ?? current.rodape,
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
  const rlDel = await limiters.mutation(user.id ?? "unknown");
  if (!rlDel.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  await saveEmailTemplate(user.organizacaoId, {
    ...DEFAULT_EMAIL_TEMPLATE,
    passos: [...DEFAULT_EMAIL_TEMPLATE.passos],
  });
  logAction("email_template_changed", user.id, getClientIp(request), { action: "reset" }, user.organizacaoId);
  return NextResponse.json({ ok: true });
}
