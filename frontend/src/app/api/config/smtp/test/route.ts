import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadSmtpConfig, isSmtpReady } from "@/lib/smtp-config";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import nodemailer from "nodemailer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SessionUser = { id?: string; role?: string; organizacaoId?: string };

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

  const rl = await limiters.smtpTest(user.id ?? "unknown");
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde antes de testar novamente." },
      { status: 429 }
    );
  }

  try {
    const { testEmail } = await request.json() as { testEmail?: string };
    const config = await loadSmtpConfig(user.organizacaoId ?? "");

    if (!isSmtpReady(config)) {
      return NextResponse.json(
        { error: "SMTP não configurado. Preencha e salve as configurações primeiro." },
        { status: 400 }
      );
    }

    const trimmed = testEmail?.trim();
    const to = trimmed && EMAIL_RE.test(trimmed) ? trimmed : config.user;
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
      subject: "Teste de conexão SMTP — Formatio",
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
          <h2 style="margin:0 0 12px;color:#1d4ed8;font-size:20px;">✅ Conexão SMTP confirmada</h2>
          <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.6;">
            Este e-mail confirma que o servidor SMTP está corretamente configurado no Formatio.
          </p>
          <p style="margin:0;color:#9ca3af;font-size:13px;">
            Enviado em ${new Date().toLocaleString("pt-BR")}
          </p>
        </div>
      `,
    });

    logAction("email_test_sent", user.id, getClientIp(request), { to });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("smtp/test", err);
    return NextResponse.json({ error: "Falha ao enviar e-mail de teste. Verifique as configurações SMTP." }, { status: 500 });
  }
}
