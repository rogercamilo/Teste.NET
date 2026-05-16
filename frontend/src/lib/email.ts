import nodemailer from "nodemailer";
import { loadSmtpConfig, isSmtpReady } from "./smtp-config";
import { loadEmailTemplate, buildEmailHtml } from "./email-template";

export async function sendWelcomeEmail({
  nome,
  email,
  tempPassword,
}: {
  nome: string;
  email: string;
  tempPassword: string;
}): Promise<{ sent: boolean; error?: string }> {
  const config = loadSmtpConfig();
  if (!isSmtpReady(config)) {
    console.warn("[email] SMTP não configurado — e-mail de boas-vindas não enviado.");
    return { sent: false, error: "SMTP não configurado" };
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const from = config.from || config.user;
  const template = loadEmailTemplate();

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
    });
    await transporter.sendMail({
      from,
      to: email,
      subject: template.assunto,
      html: buildEmailHtml(template, { nome, email, senha: tempPassword, url: appUrl }),
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] Falha ao enviar e-mail de boas-vindas:", err);
    return { sent: false, error: String(err) };
  }
}
