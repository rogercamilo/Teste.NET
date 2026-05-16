import { NextResponse } from "next/server";
import { loadSmtpConfig, isSmtpReady } from "@/lib/smtp-config";
import nodemailer from "nodemailer";

export async function POST(request: Request) {
  try {
    const { testEmail } = await request.json() as { testEmail?: string };
    const config = loadSmtpConfig();

    if (!isSmtpReady(config)) {
      return NextResponse.json(
        { error: "SMTP não configurado. Preencha e salve as configurações primeiro." },
        { status: 400 }
      );
    }

    const to = testEmail?.trim() || config.user;
    const from = config.from || config.user;

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject: "Teste de conexão SMTP — Plataforma de Formação Comunitária",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <h2 style="margin:0 0 12px;color:#1d4ed8;font-size:20px;">✅ Conexão SMTP confirmada</h2>
          <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
            Este e-mail confirma que o servidor SMTP está corretamente configurado
            na plataforma de gestão da formação comunitária.
          </p>
          <p style="margin:0;color:#9ca3af;font-size:13px;">
            Enviado em ${new Date().toLocaleString("pt-BR")}
          </p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
