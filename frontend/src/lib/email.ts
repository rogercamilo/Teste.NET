import { Resend } from "resend";
import nodemailer from "nodemailer";
import { resolveSmtpConfig, isSmtpReady, type SmtpConfig } from "./smtp-config";
import { loadEmailTemplate, buildEmailHtml, escapeHtml } from "./email-template";
import {
  renderEmail,
  heading,
  paragraph,
  button,
  linkFallback,
  callout,
  banner,
  codeBox,
  keyValues,
  featureList,
  priceBox,
  sectionLabel,
  brandLogoUrl,
  safeUrl,
} from "./email-layout";
import { logAction, logError } from "./audit-log";
import { isEmailSuppressed } from "./email-suppression";
import { prisma } from "./prisma";
import { assertPublicHost } from "./ssrf";
import { buildEventIcs, icsFileName, type CalendarEvent } from "./ics";
import { formatDataBr } from "./utils";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
/** URL absoluta do badge da marca para o cabeçalho dos e-mails. */
const LOGO_URL = brandLogoUrl(APP_URL);

// Resend takes priority over SMTP when RESEND_API_KEY is set
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
/** Endereço de envio transacional — domínio apex verificado no Resend. */
const RESEND_FROM = process.env.RESEND_FROM ?? "contato@formattio.com.br";
/**
 * Endereço de envio de marketing/ciclo de vida — subdomínio próprio (domínio
 * separado no Resend) para não contaminar a reputação dos transacionais. Cai no
 * transacional quando não configurado (seguro até `news.` ser verificado).
 */
const RESEND_FROM_MARKETING = process.env.RESEND_FROM_MARKETING ?? RESEND_FROM;
/** Nome exibido padrão quando o e-mail não é "da comunidade" (e-mails de plataforma). */
const PLATFORM_FROM_NAME = "Formattio";

/** Fluxo de envio — define o subdomínio/reputação usado pelo Resend. */
type EmailStream = "transactional" | "marketing";

/** Anexo de e-mail — `content` em base64 (ex.: um `.ics` de lembrete de agenda). */
export interface EmailAttachment {
  filename: string;
  /** Conteúdo do arquivo codificado em base64. */
  content: string;
  contentType?: string;
}

interface Sender {
  /** Nome exibido no campo "De" (ex.: nome da comunidade). */
  fromName?: string;
  /** Endereço para onde as respostas devem ir (ex.: e-mail do admin da org). */
  replyTo?: string;
}

interface SendOptions extends Sender {
  /**
   * Quando `false`, o e-mail sai com a identidade da plataforma ("Formattio")
   * em vez da comunidade — use em alertas de infraestrutura e comunicados da
   * equipe Formattio. Padrão: `true`.
   */
  brandAsOrg?: boolean;
  /**
   * Fluxo de envio: `"transactional"` (padrão) usa o subdomínio transacional;
   * `"marketing"` usa o subdomínio dedicado de marketing para isolar reputação.
   */
  stream?: EmailStream;
  /** Anexos opcionais (ex.: `.ics` de lembrete de agenda). */
  attachments?: EmailAttachment[];
}

/** Monta o cabeçalho "De" como `"Nome" <endereço>`, higienizando o nome. */
function formatFrom(name: string | undefined, address: string): string {
  const clean = name?.replace(/[\r\n"<>]/g, "").trim();
  return clean ? `"${clean}" <${address}>` : address;
}

/**
 * Resolve a identidade do remetente da organização: nome da comunidade
 * (`fromName`) e e-mail do administrador (`replyTo`). Falha de forma segura
 * retornando objeto vazio — o envio cai no padrão da plataforma.
 */
async function loadOrgSender(organizacaoId: string): Promise<Sender> {
  try {
    const org = await prisma.organizacao.findUnique({
      where: { id: organizacaoId },
      select: {
        nome: true,
        usuarios: {
          where: { perfil: "administrador", ativo: true, deletedAt: null },
          select: { email: true },
          orderBy: { criadoEm: "asc" },
          take: 1,
        },
      },
    });
    return { fromName: org?.nome, replyTo: org?.usuarios[0]?.email };
  } catch (err) {
    logError("email/org-sender", err);
    return {};
  }
}

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  fromName: string | undefined,
  replyTo: string | undefined,
  stream: EmailStream,
  attachments: EmailAttachment[] | undefined
): Promise<{ sent: boolean; error?: string }> {
  const fromAddress = stream === "marketing" ? RESEND_FROM_MARKETING : RESEND_FROM;
  try {
    const { error } = await resend!.emails.send({
      from: formatFrom(fromName, fromAddress),
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments?.length
        ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })) }
        : {}),
    });
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

async function sendViaSmtp(
  config: SmtpConfig,
  to: string,
  subject: string,
  html: string,
  fromName: string | undefined,
  replyTo: string | undefined,
  attachments: EmailAttachment[] | undefined
): Promise<{ sent: boolean; error?: string }> {
  const from = formatFrom(fromName, config.from || config.user);
  try {
    // Anti-SSRF: nunca conecta a um host SMTP interno/privado (config vem do tenant).
    await assertPublicHost(config.host);
    const transporter = createTransporter(config);
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(attachments?.length
        ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, encoding: "base64", contentType: a.contentType })) }
        : {}),
    });
    return { sent: true };
  } catch (err) {
    logError("email/smtp", err);
    return { sent: false, error: err instanceof Error ? err.message : "Falha no envio" };
  }
}

async function send(
  organizacaoId: string,
  to: string,
  subject: string,
  html: string,
  opts: SendOptions = {}
): Promise<{ sent: boolean; error?: string }> {
  // Lista de supressão: não enviar a endereços com hard bounce/reclamação —
  // proteger a reputação do domínio. Falha de forma segura (permite o envio).
  if (await isEmailSuppressed(to)) {
    logAction(
      "email_send_skipped_suppressed",
      "system",
      undefined,
      { subject: subject.slice(0, 120) },
      organizacaoId
    );
    return { sent: false, error: "Endereço na lista de supressão" };
  }

  // Identidade do remetente: por padrão, a comunidade (fromName = nome da org,
  // replyTo = admin). E-mails de plataforma usam o nome "Formattio".
  const brandAsOrg = opts.brandAsOrg ?? true;
  let fromName = opts.fromName;
  let replyTo = opts.replyTo;
  if (brandAsOrg && (fromName === undefined || replyTo === undefined)) {
    const orgSender = await loadOrgSender(organizacaoId);
    fromName = fromName ?? orgSender.fromName;
    replyTo = replyTo ?? orgSender.replyTo;
  }
  fromName = fromName ?? PLATFORM_FROM_NAME;

  // Cadeia de provedores com fallback — garante que o tenant consiga enviar
  // mesmo que o provedor preferencial falhe (ex.: domínio do Resend ainda não
  // verificado). Ordem de tentativa:
  //   1. SMTP próprio do tenant (override "enterprise" salvo no banco)
  //   2. Resend (provedor padrão da plataforma)
  //   3. SMTP de ambiente (fallback global via SMTP_*)
  const stream = opts.stream ?? "transactional";
  const attachments = opts.attachments;
  const { config: smtpConfig, fromDb: smtpFromDb } = await resolveSmtpConfig(organizacaoId);
  const smtpReady = isSmtpReady(smtpConfig);

  const attempts: Array<{ provider: string; run: () => Promise<{ sent: boolean; error?: string }> }> = [];
  if (smtpReady && smtpFromDb) {
    attempts.push({ provider: "smtp-tenant", run: () => sendViaSmtp(smtpConfig, to, subject, html, fromName, replyTo, attachments) });
  }
  if (resend) {
    attempts.push({ provider: "resend", run: () => sendViaResend(to, subject, html, fromName, replyTo, stream, attachments) });
  }
  if (smtpReady && !smtpFromDb) {
    attempts.push({ provider: "smtp-env", run: () => sendViaSmtp(smtpConfig, to, subject, html, fromName, replyTo, attachments) });
  }

  if (attempts.length === 0) {
    console.warn("[email] Nenhum provedor configurado — e-mail não enviado.");
    return { sent: false, error: "Nenhum provedor de e-mail configurado" };
  }

  let lastError: string | undefined;
  for (const { provider, run } of attempts) {
    const result = await run();
    if (result.sent) return result;
    lastError = result.error;
    // Falha intermediária: registra e tenta o próximo provedor da cadeia.
    console.warn(`[email] Provedor "${provider}" falhou (${result.error ?? "desconhecido"}); tentando próximo.`);
  }
  return { sent: false, error: lastError ?? "Falha no envio" };
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
  const template = await loadEmailTemplate(organizacaoId);
  const html = buildEmailHtml(template, {
    nome,
    email,
    senha: tempPassword,
    url: APP_URL,
    logoUrl: LOGO_URL,
  });
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
  const conteudo = [
    heading(`Olá, ${escapeHtml(nome)}!`),
    paragraph(
      `Você foi convidado(a) para acessar a plataforma formativa da comunidade <strong>${escapeHtml(orgNome)}</strong>.`
    ),
    paragraph("Clique no botão abaixo para criar sua conta. O link expira em <strong>48 horas</strong>."),
    button("Aceitar convite", inviteUrl),
    linkFallback(inviteUrl),
  ].join("");
  const html = renderEmail({
    titulo: `Convite — ${escapeHtml(orgNome)}`,
    preheader: `Você foi convidado(a) para a plataforma formativa de ${escapeHtml(orgNome)}.`,
    conteudo,
    logoUrl: LOGO_URL,
    notaRodape: "Se você não esperava este convite, pode ignorar este e-mail com segurança.",
  });
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
  const conteudo = [
    heading("Conta encerrada"),
    paragraph(`Olá, <strong>${escapeHtml(nome)}</strong>.`),
    paragraph("Sua conta na plataforma <strong>Formattio</strong> foi encerrada conforme solicitado."),
    paragraph(
      "Seus dados pessoais foram anonimizados imediatamente. Logs de auditoria são mantidos por 12 meses conforme exigência legal."
    ),
    callout(
      "danger",
      'Se não solicitou esta exclusão, entre em contato imediatamente com <a href="mailto:privacidade@formattio.com.br" style="color:inherit;">privacidade@formattio.com.br</a>.'
    ),
  ].join("");
  const html = renderEmail({
    titulo: "Sua conta Formattio foi encerrada",
    eyebrow: "Privacidade e Dados",
    conteudo,
    logoUrl: LOGO_URL,
  });
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
  const conteudo = [
    heading("Redefinição de acesso"),
    paragraph(`Olá, <strong>${escapeHtml(nome)}</strong>.`),
    paragraph(
      `O suporte da plataforma <strong>Formattio</strong> redefiniu as credenciais de acesso da organização <strong>${escapeHtml(orgNome)}</strong> a pedido do responsável.`
    ),
    paragraph(
      "Utilize a senha temporária abaixo para acessar a plataforma. Você será solicitado(a) a alterá-la imediatamente no primeiro acesso."
    ),
    codeBox({
      label: "Organização",
      value: escapeHtml(orgNome),
      sublabel: "Senha temporária",
      subvalue: escapeHtml(tempPassword),
    }),
    button("Acessar a plataforma", `${APP_URL}/login`),
    callout(
      "danger",
      '<strong>Atenção:</strong> Se você não solicitou esta redefinição, entre em contato imediatamente com o suporte em <a href="mailto:suporte@formattio.com.br" style="color:inherit;">suporte@formattio.com.br</a>.'
    ),
  ].join("");
  const html = renderEmail({
    titulo: "Redefinição de acesso",
    eyebrow: "Segurança da Conta",
    conteudo,
    logoUrl: LOGO_URL,
  });
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
  const conteudo = [
    heading(`Olá, ${escapeHtml(nome)}.`),
    paragraph(
      "Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Formattio</strong>."
    ),
    paragraph(
      "Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>2 horas</strong>."
    ),
    button("Redefinir senha", resetUrl),
    linkFallback(resetUrl),
    callout(
      "danger",
      "Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanece inalterada."
    ),
  ].join("");
  const html = renderEmail({
    titulo: "Recuperação de senha",
    preheader: "Redefina a senha da sua conta Formattio.",
    conteudo,
    logoUrl: LOGO_URL,
  });
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
  const conteudo = [
    banner("danger", "Notificação de incidente de segurança — LGPD Art. 48"),
    paragraph(`Olá, <strong>${escapeHtml(nome)}</strong>.`),
    paragraph(
      `A organização <strong>${escapeHtml(orgNome)}</strong>, em cumprimento ao Art. 48 da Lei Geral de Proteção de Dados (LGPD), notifica a ocorrência de um incidente de segurança que pode envolver seus dados pessoais.`
    ),
    keyValues([
      { label: "Data do incidente", value: escapeHtml(dataIncidente) },
      { label: "Descrição", value: escapeHtml(descricao) },
      { label: "Medidas adotadas", value: escapeHtml(medidas) },
    ]),
    paragraph(
      'Em caso de dúvidas, entre em contato com o responsável pela proteção de dados da sua organização ou com a equipe Formattio pelo e-mail <a href="mailto:privacidade@formattio.com.br" style="color:#B25433;">privacidade@formattio.com.br</a>.'
    ),
  ].join("");
  const html = renderEmail({
    titulo: "Notificação de incidente de segurança",
    eyebrow: "Aviso de Segurança",
    conteudo,
    logoUrl: LOGO_URL,
  });
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
  const safeOrg = escapeHtml(orgNome);
  const calculadoraUrl = `${APP_URL}/configuracoes?tab=plano`;

  const recursoLabel = tipoLimite === "usuarios" ? "usuários ativos" : "armazenamento";
  const mailtoSubject = encodeURIComponent(`Plano Personalizado — ${orgNome}`);
  const mailtoBody = encodeURIComponent(
    `Nome do responsável: \nNome da organização: ${orgNome}\nNúmero estimado de membros: \nTelefone/WhatsApp para retorno: `
  );
  const mailtoHref = `mailto:contato@formattio.com.br?subject=${mailtoSubject}&body=${mailtoBody}`;

  const conteudo = [
    banner("warn", `Limite do Plano Avançado atingido — ${safeOrg}`),
    paragraph("Olá!"),
    paragraph(
      `Sua organização <strong>${safeOrg}</strong> atingiu o limite de <strong>${recursoLabel}</strong> do <strong>Plano Avançado</strong>. Para continuar crescendo sem interrupções, convidamos você a conhecer o <strong>Plano Personalizado Formattio</strong>.`
    ),
    sectionLabel("O que você ganha no Plano Personalizado"),
    featureList([
      ["Usuários ilimitados", "Sem teto — cresça sem restrições"],
      ["Armazenamento sob demanda", "Calculado automaticamente pela quantidade de membros"],
      ["SLA com garantia de disponibilidade", "Acordo de nível de serviço dedicado"],
      ["Suporte prioritário", "Atendimento dedicado ao seu time"],
      ["Onboarding guiado", "O time Formattio configura tudo com você"],
      ["Contrato personalizado", "Termos adaptados à sua realidade"],
    ]),
    priceBox("R$ 889", "/mês", "Mensal ou anual · Calculado pelo número de membros"),
    button("Simular meu plano agora", calculadoraUrl),
    `<p style="margin:0 0 8px;text-align:center;"><a href="${mailtoHref}" style="font-size:13px;color:#847A6F;text-decoration:underline;">Ou fale diretamente com nosso time</a></p>`,
  ].join("");

  const html = renderEmail({
    titulo: "Limite do Plano Avançado atingido",
    preheader: "Conheça o Plano Personalizado Formattio e cresça sem interrupções.",
    eyebrow: "Seu Plano",
    conteudo,
    logoUrl: LOGO_URL,
    notaRodape: `Você recebeu este e-mail porque é administrador da organização ${safeOrg}.`,
  });

  return send(
    organizacaoId,
    email,
    `Limite do Plano Avançado atingido — conheça o Plano Personalizado`,
    html,
    { stream: "marketing", brandAsOrg: false, replyTo: "contato@formattio.com.br" }
  );
}

export async function sendPushInviteEmail({
  organizacaoId,
  nome,
  email,
  grupoNome,
  ativarUrl,
}: {
  organizacaoId: string;
  nome: string;
  email: string;
  grupoNome: string | null;
  ativarUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const conteudo = [
    heading(`Ative as notificações, ${escapeHtml(nome)}!`),
    paragraph(
      "Você está cadastrado(a) na plataforma de formação comunitária <strong>Formattio</strong>."
    ),
    grupoNome ? paragraph(`Grupo de formação: <strong>${escapeHtml(grupoNome)}</strong>`) : "",
    paragraph(
      "Clique no botão abaixo para ativar as notificações no seu celular ou computador e receber avisos sobre encontros, datas e comunicados — mesmo com o navegador fechado."
    ),
    button("Ativar notificações", ativarUrl),
    linkFallback(ativarUrl),
  ].join("");
  const html = renderEmail({
    titulo: "Ative as notificações da sua comunidade",
    preheader: "Receba avisos da sua comunidade mesmo com o navegador fechado.",
    eyebrow: "Notificações",
    conteudo,
    logoUrl: LOGO_URL,
    notaRodape:
      "Sem spam. Apenas avisos da sua comunidade. Você pode cancelar a qualquer momento acessando o mesmo link.",
  });
  return send(organizacaoId, email, "Ative as notificações da sua comunidade — Formattio", html);
}

export async function sendTrialExpiringEmail({
  organizacaoId,
  email,
  nome,
  orgNome,
  trialExpiresAt,
}: {
  organizacaoId: string;
  email: string;
  nome: string;
  orgNome: string;
  trialExpiresAt: Date;
}): Promise<{ sent: boolean; error?: string }> {
  const safeOrg = escapeHtml(orgNome);
  const dataExpiry = trialExpiresAt.toLocaleDateString("pt-BR");
  const daysLeft = Math.max(0, Math.ceil((trialExpiresAt.getTime() - Date.now()) / 86_400_000));
  const diaLabel = `${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`;
  const planoUrl = `${APP_URL}/configuracoes?tab=plano`;

  const conteudo = [
    banner("warn", `Período de experiência expira em ${diaLabel}`),
    paragraph(`Olá, <strong>${escapeHtml(nome)}</strong>!`),
    paragraph(
      `O período de experiência da organização <strong>${safeOrg}</strong> na plataforma Formattio expira em <strong>${dataExpiry}</strong>.`
    ),
    paragraph(
      "Para continuar utilizando todos os recursos sem interrupção, assine um dos planos antes da data de expiração."
    ),
    button("Escolher um plano", planoUrl),
    linkFallback(planoUrl),
  ].join("");
  const html = renderEmail({
    titulo: `Seu período de experiência expira em ${diaLabel}`,
    preheader: `Assine um plano antes de ${dataExpiry} para não perder o acesso.`,
    eyebrow: "Seu Plano",
    conteudo,
    logoUrl: LOGO_URL,
    notaRodape: `Você recebeu este e-mail por ser administrador(a) da organização ${safeOrg}.`,
  });
  return send(
    organizacaoId,
    email,
    `Seu período de experiência expira em ${diaLabel} — Formattio`,
    html,
    { stream: "marketing", brandAsOrg: false, replyTo: "contato@formattio.com.br" }
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
  const conteudo = [
    heading("Alerta de uso"),
    paragraph(
      `O recurso <strong>${safeRecurso}</strong> da organização <strong>${safeOrg}</strong> está em <strong>${safePct}%</strong> do limite do plano atual.`
    ),
    paragraph("Considere fazer upgrade do plano para evitar interrupções."),
    button("Gerenciar plano", `${appUrl.replace(/\/+$/, "")}/configuracoes`),
  ].join("");
  const html = renderEmail({
    titulo: "Alerta de uso",
    eyebrow: "Seu Plano",
    conteudo,
    logoUrl: LOGO_URL,
  });
  const subjectOrg = orgNome.replace(/[\r\n]/g, "");
  const subjectRec = recurso.replace(/[\r\n]/g, "");
  return send(organizacaoId, email, `Alerta de limite — ${subjectRec} em ${safePct}% (${subjectOrg})`, html);
}

export async function sendDbPoolAlertEmail({
  organizacaoId,
  email,
  nome,
  percentUso,
  total,
  max,
  appUrl,
}: {
  organizacaoId: string;
  email: string;
  nome: string;
  percentUso: number;
  total: number;
  max: number;
  appUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const pct = Number(percentUso).toFixed(0);
  const conteudo = [
    banner("danger", `⚠️ Pool de conexões do banco em ${pct}%`),
    paragraph(`Olá, ${escapeHtml(nome)}.`),
    paragraph(
      `O PostgreSQL está usando <strong>${total} de ${max}</strong> conexões disponíveis (<strong>${pct}%</strong>), acima do limite de alerta de 80%.`
    ),
    paragraph(
      "Sob carga sustentada perto do limite, novas conexões podem falhar. Recomenda-se adotar um <strong>connection pooler</strong> (PgBouncer em modo transaction ou Prisma Accelerate) ou revisar o <code>DATABASE_POOL_SIZE</code> por réplica."
    ),
    button("Ver infraestrutura", `${appUrl.replace(/\/+$/, "")}/super-admin?tab=infraestrutura`),
  ].join("");
  const html = renderEmail({
    titulo: `Pool de conexões em ${pct}%`,
    eyebrow: "Infraestrutura",
    conteudo,
    logoUrl: LOGO_URL,
    notaRodape:
      "Você está recebendo este alerta porque é administrador da plataforma. Novo alerta só será enviado após algumas horas, mesmo que a condição persista.",
  });
  return send(organizacaoId, email, `⚠️ Pool de conexões em ${pct}% — Formattio`, html, {
    brandAsOrg: false,
  });
}

export async function sendSecurityAlertEmail({
  organizacaoId,
  email,
  nome,
  signals,
  windowMinutes,
  appUrl,
}: {
  organizacaoId: string;
  email: string;
  nome: string;
  signals: { label: string; count: number; threshold: number }[];
  windowMinutes: number;
  appUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const linhas = signals
    .map(
      (s) =>
        `<li><strong>${escapeHtml(s.label)}</strong>: ${s.count} nos últimos ${windowMinutes} min (limiar ${s.threshold})</li>`
    )
    .join("");
  const conteudo = [
    banner("danger", "⚠️ Pico de eventos de segurança detectado"),
    paragraph(`Olá, ${escapeHtml(nome)}.`),
    paragraph(
      `Nos últimos <strong>${windowMinutes} minutos</strong> um ou mais indicadores de possível ataque cruzaram o limiar de alerta:`
    ),
    `<ul style="margin:0 0 16px;padding-left:20px;line-height:1.7">${linhas}</ul>`,
    paragraph(
      "Isso pode indicar tentativa de força bruta, credential stuffing ou sondagem de upload malicioso. Verifique a trilha de auditoria e, se confirmado, considere bloquear a origem."
    ),
    button("Ver segurança", `${appUrl.replace(/\/+$/, "")}/super-admin?tab=seguranca`),
  ].join("");
  const html = renderEmail({
    titulo: "Pico de eventos de segurança",
    eyebrow: "Segurança",
    conteudo,
    logoUrl: LOGO_URL,
    notaRodape:
      "Você está recebendo este alerta porque é administrador da plataforma. Novo alerta só será enviado após algumas horas, mesmo que a condição persista.",
  });
  return send(organizacaoId, email, "⚠️ Pico de eventos de segurança — Formattio", html, {
    brandAsOrg: false,
  });
}

export async function sendPortalMagicLinkEmail({
  organizacaoId,
  nome,
  email,
  magicLinkUrl,
}: {
  organizacaoId: string;
  nome: string;
  email: string;
  magicLinkUrl: string;
}): Promise<{ sent: boolean; error?: string }> {
  const conteudo = [
    heading(`Olá, ${escapeHtml(nome)}!`),
    paragraph(
      "Recebemos uma solicitação de acesso ao seu portal de formação. Clique no botão abaixo para entrar."
    ),
    paragraph("O link é válido por <strong>15 minutos</strong>."),
    button("Acessar meu portal", magicLinkUrl),
    linkFallback(magicLinkUrl),
    callout(
      "info",
      "Se não solicitou este acesso, ignore este e-mail. Nenhuma ação é necessária."
    ),
  ].join("");
  const html = renderEmail({
    titulo: "Seu link de acesso ao portal",
    preheader: "Acesse seu portal de formação — link válido por 15 minutos.",
    eyebrow: "Portal do Formando",
    conteudo,
    logoUrl: LOGO_URL,
  });
  return send(organizacaoId, email, "Seu link de acesso ao portal — Formattio", html);
}

export async function sendComunicadoEmail({
  organizacaoId,
  to,
  nome,
  assunto,
  mensagem,
  orgNome,
}: {
  organizacaoId: string;
  to: string;
  nome: string;
  assunto: string;
  mensagem: string;
  orgNome: string;
}): Promise<{ sent: boolean; error?: string }> {
  const safeMsg = escapeHtml(mensagem).replace(/\n/g, "<br/>");
  const conteudo = [
    heading(`Olá, ${escapeHtml(nome)}!`),
    paragraph(safeMsg),
  ].join("");
  const html = renderEmail({
    titulo: assunto,
    eyebrow: "Comunicado",
    conteudo,
    logoUrl: LOGO_URL,
    notaRodape: `Esta mensagem foi enviada para os administradores de <strong>${escapeHtml(orgNome)}</strong> pela equipe Formattio.`,
  });
  return send(organizacaoId, to, assunto, html, {
    brandAsOrg: false,
    replyTo: "contato@formattio.com.br",
  });
}

/** Antecedência do lembrete de agenda. */
export type ReminderQuando = "24h" | "2h";

/**
 * Lembrete de encontro agendado (T-24h / T-2h) com o `.ics` do evento anexado.
 * Reaproveita `buildEventIcs` (lib/ics.ts). Envio transacional; a suppression
 * list é aplicada dentro de `send()`.
 */
export async function sendAgendamentoReminderEmail({
  organizacaoId,
  email,
  nome,
  agendamento,
  quando,
  appUrl = APP_URL,
}: {
  organizacaoId: string;
  email: string;
  nome: string;
  agendamento: {
    id: string;
    formacaoTema: string;
    dataInicio: Date;
    dataFim: Date;
    local?: string | null;
    linkOnline?: string | null;
  };
  quando: ReminderQuando;
  appUrl?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const antecedencia = quando === "24h" ? "amanhã" : "em cerca de 2 horas";
  const tema = escapeHtml(agendamento.formacaoTema || "Encontro formativo");
  const quandoTxt = formatDataBr(agendamento.dataInicio);

  const linhas: { label: string; value: string }[] = [{ label: "Quando", value: quandoTxt }];
  if (agendamento.local) linhas.push({ label: "Local", value: escapeHtml(agendamento.local) });
  if (agendamento.linkOnline) {
    linhas.push({
      label: "Online",
      value: `<a href="${safeUrl(agendamento.linkOnline)}" style="color:#B25433;word-break:break-all;">${escapeHtml(agendamento.linkOnline)}</a>`,
    });
  }

  const agendaUrl = `${appUrl.replace(/\/+$/, "")}/agenda`;
  const conteudo = [
    banner("info", `Lembrete: ${tema} acontece ${antecedencia}`),
    paragraph(`Olá, <strong>${escapeHtml(nome)}</strong>!`),
    paragraph(`Este é um lembrete do encontro <strong>${tema}</strong>.`),
    keyValues(linhas),
    paragraph("O convite está anexado (<strong>.ics</strong>) — abra para adicionar ao seu calendário."),
    button("Ver na agenda", agendaUrl),
    linkFallback(agendaUrl),
  ].join("");

  const html = renderEmail({
    titulo: `Lembrete: ${agendamento.formacaoTema || "Encontro formativo"}`,
    preheader: `${agendamento.formacaoTema || "Encontro"} — ${quandoTxt}`,
    eyebrow: "Lembrete de Agenda",
    conteudo,
    logoUrl: LOGO_URL,
  });

  const evento: CalendarEvent = {
    id: agendamento.id,
    title: agendamento.formacaoTema || "Encontro formativo",
    start: agendamento.dataInicio,
    end: agendamento.dataFim,
    location: agendamento.local ?? agendamento.linkOnline ?? undefined,
  };
  const ics = buildEventIcs(evento);
  const attachment: EmailAttachment = {
    filename: icsFileName(agendamento.formacaoTema || "encontro"),
    content: Buffer.from(ics, "utf-8").toString("base64"),
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };

  return send(organizacaoId, email, `Lembrete: ${agendamento.formacaoTema || "encontro"} — ${antecedencia}`, html, {
    attachments: [attachment],
  });
}

/**
 * Digest de formandos em risco (item 3.3) enviado ao Formador Comunitário do
 * grupo — lista de membros que precisam de atenção com o motivo de cada um.
 * Envio transacional; a suppression list é aplicada dentro de `send()`.
 */
export async function sendFormandosEmRiscoEmail({
  organizacaoId,
  email,
  nomeFormador,
  grupoNome,
  grupoId,
  membros,
  termoFormando = "formando",
  appUrl = APP_URL,
}: {
  organizacaoId: string;
  email: string;
  nomeFormador: string;
  grupoNome: string;
  grupoId: string;
  membros: { nome: string; motivos: string[] }[];
  termoFormando?: string;
  appUrl?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const n = membros.length;
  const plural = n !== 1;
  const linhas = membros.map((m) => ({
    label: escapeHtml(m.nome),
    value: m.motivos.map((x) => escapeHtml(x)).join(" · "),
  }));
  const jornadaUrl = `${appUrl.replace(/\/+$/, "")}/grupos-formacao/${grupoId}?tab=jornada`;

  const conteudo = [
    heading(`Olá, ${escapeHtml(nomeFormador)}!`),
    paragraph(
      `${n} ${escapeHtml(termoFormando)}${plural ? "s" : ""} da <strong>${escapeHtml(grupoNome)}</strong> ${plural ? "precisam" : "precisa"} de atenção — ${plural ? "estão" : "está"} com presença baixa ou atrasado${plural ? "s" : ""} no ritmo da etapa.`
    ),
    keyValues(linhas),
    button("Ver na jornada", jornadaUrl),
    linkFallback(jornadaUrl),
    callout("info", "Um acompanhamento no momento certo ajuda o membro a retomar a jornada."),
  ].join("");

  const html = renderEmail({
    titulo: `${n} ${escapeHtml(termoFormando)}${plural ? "s" : ""} ${plural ? "precisam" : "precisa"} de atenção`,
    preheader: `Membros da ${escapeHtml(grupoNome)} para acompanhar de perto.`,
    eyebrow: "Acompanhamento",
    conteudo,
    logoUrl: LOGO_URL,
  });

  return send(
    organizacaoId,
    email,
    `${n} ${termoFormando}${plural ? "s" : ""} da ${grupoNome} ${plural ? "precisam" : "precisa"} de atenção`,
    html
  );
}
