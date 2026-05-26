import { Resend } from "resend";
import nodemailer from "nodemailer";
import { loadSmtpConfig, isSmtpReady, type SmtpConfig } from "./smtp-config";
import { loadEmailTemplate, buildEmailHtml } from "./email-template";
import { logError } from "./audit-log";

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function safeUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? esc(url) : "#";
}

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
    logError("email/resend", error);
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
    logError("email/smtp", err);
    return { sent: false, error: err instanceof Error ? err.message : "Falha no envio" };
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
  const safeName = esc(nome);
  const safeOrg = esc(orgNome);
  const safeInviteUrl = safeUrl(inviteUrl);
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Olá, ${safeName}!</h2>
      <p>Você foi convidado(a) para acessar a plataforma formativa da comunidade <strong>${safeOrg}</strong>.</p>
      <p>Clique no botão abaixo para criar sua conta. O link expira em <strong>48 horas</strong>.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${safeInviteUrl}"
           style="background: #6d28d9; color: white; text-decoration: none;
                  padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px;">
          Aceitar convite
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br/>
        <a href="${safeInviteUrl}">${safeInviteUrl}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">
        Se você não esperava este convite, pode ignorar este e-mail com segurança.
      </p>
    </div>
  `;
  return send(organizacaoId, email, `Convite para ${orgNome.replace(/[\r\n]/g, "")} — Formatio`, html);
}

export async function sendAccountDeletionEmail({
  organizacaoId,
  nome,
  email,
}: {
  organizacaoId: string;
  nome: string;
  email: string;
}): Promise<{ sent: boolean; error?: string }> {
  const safeName = esc(nome);
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Conta encerrada</h2>
      <p>Olá, <strong>${safeName}</strong>.</p>
      <p>Sua conta na plataforma <strong>Formatio</strong> foi encerrada conforme solicitado.</p>
      <p>Seus dados pessoais foram anonimizados imediatamente. Logs de auditoria são mantidos por 12 meses conforme exigência legal.</p>
      <p>Se não solicitou esta exclusão, entre em contato imediatamente com <a href="mailto:privacidade@formatio.app">privacidade@formatio.app</a>.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Formatio — plataforma de gestão formativa</p>
    </div>
  `;
  return send(organizacaoId, email, "Sua conta Formatio foi encerrada", html);
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
  const safeRecurso = esc(recurso);
  const safeOrg = esc(orgNome);
  const safePct = Number(percentUsed).toFixed(0);
  const safeAppUrl = safeUrl(appUrl);
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #d97706;">Alerta de uso</h2>
      <p>O recurso <strong>${safeRecurso}</strong> da organização <strong>${safeOrg}</strong> está em <strong>${safePct}%</strong> do limite do plano atual.</p>
      <p>Considere fazer upgrade do plano para evitar interrupções.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${safeAppUrl}/configuracoes"
           style="background: #6d28d9; color: white; text-decoration: none;
                  padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Gerenciar plano
        </a>
      </p>
    </div>
  `;
  const subjectOrg = orgNome.replace(/[\r\n]/g, "");
  const subjectRec = recurso.replace(/[\r\n]/g, "");
  return send(organizacaoId, email, `Alerta de limite — ${subjectRec} em ${safePct}% (${subjectOrg})`, html);
}
