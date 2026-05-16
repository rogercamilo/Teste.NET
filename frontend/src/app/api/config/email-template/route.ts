import { NextResponse } from "next/server";
import { loadEmailTemplate, saveEmailTemplate, DEFAULT_EMAIL_TEMPLATE } from "@/lib/email-template";

export async function GET() {
  const template = loadEmailTemplate();
  return NextResponse.json(template);
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const current = loadEmailTemplate();
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
    saveEmailTemplate(updated);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  saveEmailTemplate({ ...DEFAULT_EMAIL_TEMPLATE, passos: [...DEFAULT_EMAIL_TEMPLATE.passos] });
  return NextResponse.json({ ok: true });
}
