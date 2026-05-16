import { NextResponse } from "next/server";
import { loadSmtpConfig, saveSmtpConfig, isSmtpReady } from "@/lib/smtp-config";

export async function GET() {
  try {
    const config = loadSmtpConfig();
    return NextResponse.json({
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      pass: config.pass ? "***" : "",
      from: config.from,
      configured: isSmtpReady(config),
    });
  } catch {
    return NextResponse.json({ error: "Falha ao carregar configuração SMTP" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json() as {
      host?: string;
      port?: number;
      secure?: boolean;
      user?: string;
      pass?: string;
      from?: string;
    };
    const current = loadSmtpConfig();
    const updated = {
      host: body.host ?? current.host,
      port: Number(body.port ?? current.port),
      secure: Boolean(body.secure ?? current.secure),
      user: body.user ?? current.user,
      // "***" is the sentinel meaning "keep existing password"
      pass: body.pass === "***" ? current.pass : (body.pass ?? current.pass),
      from: body.from ?? current.from,
    };
    saveSmtpConfig(updated);
    return NextResponse.json({ ok: true, configured: isSmtpReady(updated) });
  } catch {
    return NextResponse.json({ error: "Falha ao salvar configuração SMTP" }, { status: 500 });
  }
}
