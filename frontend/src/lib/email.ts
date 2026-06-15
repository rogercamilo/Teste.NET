import { Resend } from "resend";
import nodemailer from "nodemailer";
import { loadSmtpConfig, isSmtpReady, type SmtpConfig } from "./smtp-config";
import { loadEmailTemplate, buildEmailHtml, escapeHtml } from "./email-template";
import { logError } from "./audit-log";

function safeUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? escapeHtml(url) : "#";
}

// Resend takes priority over SMTP when RESEND_API_KEY is set
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RESEND_FROM = process.env.RESEND_FROM ?? "contato@formattio.com.br";

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  try {
    const { error } = await resend!.emails.send({ from: RESEND_FROM, to, subject, html });
    if (error) {
      logError("email/resend", error);
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    logError("email/resend", err);
    return { sent: false, error: err instanceof Error ? err.message : "Falha no envio" };
  }
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
  const safeName = escapeHtml(nome);
  const safeOrg = escapeHtml(orgNome);
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
  return send(organizacaoId, email, `Convite para ${orgNome.replace(/[\r\n]/g, "")} — Formattio`, html);
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
  const safeName = escapeHtml(nome);
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Conta encerrada</h2>
      <p>Olá, <strong>${safeName}</strong>.</p>
      <p>Sua conta na plataforma <strong>Formattio</strong> foi encerrada conforme solicitado.</p>
      <p>Seus dados pessoais foram anonimizados imediatamente. Logs de auditoria são mantidos por 12 meses conforme exigência legal.</p>
      <p>Se não solicitou esta exclusão, entre em contato imediatamente com <a href="mailto:privacidade@formattio.com.br">privacidade@formattio.com.br</a>.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Formattio — plataforma de gestão formativa</p>
    </div>
  `;
  return send(organizacaoId, email, "Sua conta Formattio foi encerrada", html);
}

export async function sendCredentialResetEmail({
  organizacaoId,
  nome,
  email,
  tempPassword,
  orgNome,
}: {
  organizacaoId: string;
  nome: string;
  email: string;
  tempPassword: string;
  orgNome: string;
}): Promise<{ sent: boolean; error?: string }> {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const safeName = escapeHtml(nome);
  const safeOrg = escapeHtml(orgNome);
  const safePassword = escapeHtml(tempPassword);
  const safeAppUrl = safeUrl(appUrl);
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #d97706;">Redefinição de acesso</h2>
      <p>Olá, <strong>${safeName}</strong>.</p>
      <p>O suporte da plataforma <strong>Formattio</strong> redefiniu as credenciais de acesso da organização <strong>${safeOrg}</strong> a pedido do responsável.</p>
      <p>Utilize a senha temporária abaixo para acessar a plataforma. Você será solicitado(a) a alterá-la imediatamente no primeiro acesso.</p>
      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:16px;margin:24px 0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Senha Temporária</p>
        <p style="margin:0;font-size:20px;font-weight:bold;font-family:monospace;color:#1a1a1a;letter-spacing:0.1em;">${safePassword}</p>
      </div>
      <p style="text-align:center;margin:32px 0;">
        <a href="${safeAppUrl}/login"
           style="background:#6d28d9;color:white;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:15px;">
          Acessar a plataforma
        </a>
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;margin:16px 0;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          <strong>Atenção:</strong> Se você não solicitou esta redefinição, entre em contato imediatamente com o suporte em
          <a href="mailto:suporte@formattio.com.br" style="color:#991b1b;">suporte@formattio.com.br</a>.
        </p>
      </div>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#999;font-size:12px;">Formattio — plataforma de gestão formativa</p>
    </div>
  `;
  return send(organizacaoId, email, `Redefinição de acesso — ${orgNome.replace(/[\r\n]/g, "")}`, html);
}

export async function sendPasswordResetEmail({
  organizacaoId,
  nome,
  email,
  resetUrl,
}: {
  organizacaoId: string;
  nome: string;
  email: string;
  resetUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const safeName = escapeHtml(nome);
  const safeResetUrl = safeUrl(resetUrl);
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Recuperação de senha</h2>
      <p>Olá, <strong>${safeName}</strong>.</p>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Formattio</strong>.</p>
      <p>Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>2 horas</strong>.</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${safeResetUrl}"
           style="background: #6d28d9; color: white; text-decoration: none;
                  padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 15px;">
          Redefinir senha
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">
        Se não conseguir clicar no botão, copie e cole este link no seu navegador:<br/>
        <a href="${safeResetUrl}">${safeResetUrl}</a>
      </p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin: 16px 0;">
        <p style="margin: 0; font-size: 13px; color: #991b1b;">
          Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanece inalterada.
        </p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Formattio — plataforma de gestão formativa</p>
    </div>
  `;
  return send(organizacaoId, email, "Recuperação de senha — Formattio", html);
}

export async function sendIncidentNotificationEmail({
  organizacaoId,
  email,
  nome,
  orgNome,
  descricao,
  dataIncidente,
  medidas,
}: {
  organizacaoId: string;
  email: string;
  nome: string;
  orgNome: string;
  descricao: string;
  dataIncidente: string;
  medidas: string;
}): Promise<{ sent: boolean; error?: string }> {
  const safeName = escapeHtml(nome);
  const safeOrg = escapeHtml(orgNome);
  const safeDesc = escapeHtml(descricao);
  const safeMedidas = escapeHtml(medidas);
  const safeData = escapeHtml(dataIncidente);
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 13px; font-weight: bold; color: #dc2626;">
          NOTIFICAÇÃO DE INCIDENTE DE SEGURANÇA — LGPD Art. 48
        </p>
      </div>
      <p>Olá, <strong>${safeName}</strong>.</p>
      <p>A organização <strong>${safeOrg}</strong>, em cumprimento ao Art. 48 da Lei Geral de Proteção de Dados (LGPD), notifica a ocorrência de um incidente de segurança que pode envolver seus dados pessoais.</p>
      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #374151;">Data do incidente</p>
        <p style="margin: 0 0 16px; font-size: 14px;">${safeData}</p>
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #374151;">Descrição</p>
        <p style="margin: 0 0 16px; font-size: 14px;">${safeDesc}</p>
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #374151;">Medidas adotadas</p>
        <p style="margin: 0; font-size: 14px;">${safeMedidas}</p>
      </div>
      <p style="font-size: 13px; color: #374151;">
        Em caso de dúvidas, entre em contato com o responsável pela proteção de dados da sua organização
        ou com a equipe Formattio pelo e-mail
        <a href="mailto:privacidade@formattio.com.br">privacidade@formattio.com.br</a>.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
      <p style="color: #999; font-size: 12px;">Formattio — plataforma de gestão formativa</p>
    </div>
  `;
  return send(organizacaoId, email, `Notificação de incidente de segurança — ${orgNome.replace(/[\r\n]/g, "")}`, html);
}

export async function sendPlanLimitReachedEmail({
  organizacaoId,
  email,
  orgNome,
  tipoLimite,
}: {
  organizacaoId: string;
  email: string;
  orgNome: string;
  tipoLimite: "usuarios" | "storage";
}): Promise<{ sent: boolean; error?: string }> {
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const safeOrg = escapeHtml(orgNome);
  const safeAppUrl = safeUrl(appUrl);
  const calculadoraUrl = `${safeAppUrl}/configuracoes?tab=plano`;

  const recursoLabel = tipoLimite === "usuarios" ? "usuários ativos" : "armazenamento";
  const mailtoSubject = encodeURIComponent(`Plano Personalizado — ${orgNome}`);
  const mailtoBody = encodeURIComponent(
    `Nome do responsável: \nNome da organização: ${orgNome}\nNúmero estimado de membros: \nTelefone/WhatsApp para retorno: `
  );
  const mailtoHref = `mailto:contato@formattio.com.br?subject=${mailtoSubject}&body=${mailtoBody}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 580px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #fef3c7; border-left: 4px solid #d97706; padding: 14px 18px; border-radius: 4px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; font-weight: 600; color: #92400e;">
          Limite do Plano Avançado atingido — ${safeOrg}
        </p>
      </div>

      <p>Olá!</p>
      <p>
        Sua organização <strong>${safeOrg}</strong> atingiu o limite de <strong>${recursoLabel}</strong>
        do <strong>Plano Avançado</strong>. Para continuar crescendo sem interrupções, convidamos você a
        conhecer o <strong>Plano Personalizado Formattio</strong>.
      </p>

      <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="margin: 0 0 12px; font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em;">
          O que você ganha no Plano Personalizado
        </p>
        <table style="width: 100%; border-collapse: collapse;">
          ${[
            ["Usuários ilimitados", "Sem teto — cresça sem restrições"],
            ["Armazenamento sob demanda", "Calculado automaticamente pela quantidade de membros"],
            ["SLA com garantia de disponibilidade", "Acordo de nível de serviço dedicado"],
            ["Suporte prioritário", "Atendimento dedicado ao seu time"],
            ["Onboarding guiado", "O time Formattio configura tudo com você"],
            ["Contrato personalizado", "Termos adaptados à sua realidade"],
          ].map(([feat, desc]) => `
            <tr>
              <td style="padding: 6px 0; vertical-align: top; width: 20px;">
                <span style="color: #d97706; font-size: 16px;">✓</span>
              </td>
              <td style="padding: 6px 8px; vertical-align: top;">
                <strong style="font-size: 13px;">${feat}</strong>
                <br/><span style="font-size: 12px; color: #6b7280;">${desc}</span>
              </td>
            </tr>
          `).join("")}
        </table>
      </div>

      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #92400e; font-weight: 600; text-transform: uppercase;">A partir de</p>
        <p style="margin: 0; font-size: 32px; font-weight: 800; color: #1a1a1a;">R$ 889<span style="font-size: 14px; font-weight: 400; color: #6b7280;">/mês</span></p>
        <p style="margin: 4px 0 0; font-size: 12px; color: #6b7280;">Mensal ou anual · Calculado pelo número de membros</p>
      </div>

      <p style="text-align: center; margin: 28px 0 12px;">
        <a href="${calculadoraUrl}"
           style="display: inline-block; background: #b25433; color: white; text-decoration: none;
                  padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">
          Simular meu plano agora
        </a>
      </p>
      <p style="text-align: center; margin: 0;">
        <a href="${mailtoHref}"
           style="font-size: 13px; color: #6b7280; text-decoration: underline;">
          Ou fale diretamente com nosso time
        </a>
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Formattio — plataforma de gestão formativa<br/>
        Você recebeu este e-mail porque é administrador da organização ${safeOrg}.
      </p>
    </div>
  `;

  return send(
    organizacaoId,
    email,
    `Limite do Plano Avançado atingido — conheça o Plano Personalizado`,
    html
  );
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
  const safeRecurso = escapeHtml(recurso);
  const safeOrg = escapeHtml(orgNome);
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
