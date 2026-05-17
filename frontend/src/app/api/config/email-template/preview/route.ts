import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildEmailHtml, loadEmailTemplate } from "@/lib/email-template";
import type { EmailTemplate, TemplateVars } from "@/lib/email-template";

type SessionUser = { id?: string; role?: string };

function isAdminOrAbove(role: string | undefined): boolean {
  return role === "administrador" || role === "formador_geral";
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!isAdminOrAbove(user.role)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  try {
    const body = await request.json() as { template?: Partial<EmailTemplate> };
    const base = loadEmailTemplate();
    const template: EmailTemplate = body.template
      ? {
          assunto: body.template.assunto ?? base.assunto,
          saudacao: body.template.saudacao ?? base.saudacao,
          mensagem1: body.template.mensagem1 ?? base.mensagem1,
          mensagem2: body.template.mensagem2 ?? base.mensagem2,
          passos: body.template.passos ?? base.passos,
          textoBotao: body.template.textoBotao ?? base.textoBotao,
          avisoSeguranca: body.template.avisoSeguranca ?? base.avisoSeguranca,
          rodape: body.template.rodape ?? base.rodape,
        }
      : base;

    const vars: TemplateVars = {
      nome: "Maria Silva",
      email: "maria.silva@exemplo.com",
      senha: "Xy7!kP2m",
      url: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    };

    const html = buildEmailHtml(template, vars);
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
