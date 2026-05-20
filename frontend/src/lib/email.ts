import nodemailer from "nodemailer";
import { loadSmtpConfig, isSmtpReady } from "./smtp-config";
import { loadEmailTemplate, buildEmailHtml } from "./email-template";

function createTransporter(config: ReturnType<typeof loadSmtpConfig>) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

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
    const transporter = createTransporter(config);
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

export async function sendInviteEmail({
  nome,
  email,
  inviteUrl,
  orgNome,
}: {
  nome: string;
  email: string;
  inviteUrl: string;
  orgNome: string;
}): Promise<{ sent: boolean; error?: string }> {
  const config = loadSmtpConfig();
  if (!isSmtpReady(config)) {
    console.warn("[email] SMTP não configurado — e-mail de convite não enviado.");
    return { sent: false, error: "SMTP não configurado" };
  }

  const from = config.from || config.user;

  try {
    const transporter = createTransporter(config);
    await transporter.sendMail({
      from,
      to: email,
      subject: `Convite para ${orgNome} — Plataforma Formativa`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Olá, ${nome}!</h2>
          <p>Você foi convidado(a) para acessar a plataforma formativa da comunidade <strong>${orgNome}</strong>.</p>
          <p>Clique no botão abaixo para criar sua conta. O link expira em <strong>48 horas</strong>.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}"
               style="background: #6d28d9; color: white; text-decoration: none;
                      padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px;">
              Aceitar convite
            </a>
          </p>
          <p style="color: #666; font-size: 13px;">
            Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br/>
            <a href="${inviteUrl}">${inviteUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            Se você não esperava este convite, pode ignorar este e-mail com segurança.
          </p>
        </div>
      `,
    });
    return { sent: true };
  } catch (err) {
    console.error("[email] Falha ao enviar convite:", err);
    return { sent: false, error: String(err) };
  }
}

export async function sendLimitAlertEmail({
  email,
  orgNome,
  recurso,
  percentUsed,
  appUrl,
}: {
  email: string;
  orgNome: string;
  recurso: string;
  percentUsed: number;
  appUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const config = loadSmtpConfig();
  if (!isSmtpReady(config)) return { sent: false, error: "SMTP não configurado" };

  const from = config.from || config.user;

  try {
    const transporter = createTransporter(config);
    await transporter.sendMail({
      from,
      to: email,
      subject: `Alerta de limite — ${recurso} em ${percentUsed}% (${orgNome})`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #d97706;">⚠️ Alerta de uso</h2>
          <p>O recurso <strong>${recurso}</strong> da organização <strong>${orgNome}</strong> está em <strong>${percentUsed}%</strong> do limite do plano atual.</p>
          <p>Considere fazer upgrade do plano para evitar interrupções.</p>
          <p style="text-align: center; margin: 32px 0;">
            <a href="${appUrl}/configuracoes"
               style="background: #6d28d9; color: white; text-decoration: none;
                      padding: 12px 24px; border-radius: 6px; font-weight: bold;">
              Gerenciar plano
            </a>
          </p>
        </div>
      `,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: String(err) };
  }
}
