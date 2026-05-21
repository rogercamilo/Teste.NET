import { Resend } from "resend";
import nodemailer from "nodemailer";
import { loadSmtpConfig, isSmtpReady, type SmtpConfig } from "./smtp-config";
import { loadEmailTemplate, buildEmailHtml } from "./email-template";

// Resend takes priority over SMTP when RESEND_API_KEY is set
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RESEND_FROM = process.env.RESEND_FROM ?? "noreply@formatio.app";

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  const { error } = await resend!.emails.send({ from: RESEND_FROM, to, subject, html });
  if (error) {
    console.error("[email/resend] Falha:", error);
    return { sent: false, error: error.message };
  }
  return { sent: true };
}

function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
}

async function send(
  organizacaoId: string,
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  if (resend) return sendViaResend(to, subject, html);

  const config = await loadSmtpConfig(organizacaoId);
  if (!isSmtpReady(config)) {
    console.warn("[email] Nenhum provedor configurado — e-mail não enviado.");
    return { sent: false, error: "Nenhum provedor de e-mail configurado" };
  }
  const from = config.from || config.user;
  try {
    const transporter = createTransporter(config);
    await transporter.sendMail({ from, to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error("[email/smtp] Falha:", err);
    return { sent: false, error: String(err) };
  }
}

export async function sendWelcomeEmail({
  organizacaoId,
  nome,
  email,
  tempPassword,
}: {
  organizacaoId: string;
  nome: string;
  email: string;
  tempPassword: string;
}): Promise<{ sent: boolean; error?: string }> {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const template = await loadEmailTemplate(organizacaoId);
  const html = buildEmailHtml(template, { nome, email, senha: tempPassword, url: appUrl });
  return send(organizacaoId, email, template.assunto, html);
}

export async function sendInviteEmail({
  organizacaoId,
  nome,
  email,
  inviteUrl,
  orgNome,
}: {
  organizacaoId: string;
  nome: string;
  email: string;
  inviteUrl: string;
  orgNome: string;
}): Promise<{ sent: boolean; error?: string }> {
  const html = `
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
  `;
  return send(organizacaoId, email, `Convite para ${orgNome} — Formatio`, html);
}

export async function sendLimitAlertEmail({
  organizacaoId,
  email,
  orgNome,
  recurso,
  percentUsed,
  appUrl,
}: {
  organizacaoId: string;
  email: string;
  orgNome: string;
  recurso: string;
  percentUsed: number;
  appUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #d97706;">Alerta de uso</h2>
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
  `;
  return send(organizacaoId, email, `Alerta de limite — ${recurso} em ${percentUsed}% (${orgNome})`, html);
}
