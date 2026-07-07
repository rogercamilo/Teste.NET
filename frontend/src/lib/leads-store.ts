import { randomBytes } from "crypto";
import { prisma } from "./prisma";
import { logAction, logError } from "./audit-log";
import { isEmailSuppressed, normalizeEmail } from "./email-suppression";
import { sendLeadOptInEmail, sendLeadWelcomeEmail } from "./email";
import { CONSENT_VERSAO } from "./leads-config";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

/** Gera um token opaco (segredo) para confirmar/descadastrar em 1 clique. */
function novoToken(): string {
  return randomBytes(32).toString("base64url");
}

function confirmUrl(token: string): string {
  return `${APP_URL.replace(/\/+$/, "")}/api/leads/confirm?token=${encodeURIComponent(token)}`;
}

function unsubscribeUrl(token: string): string {
  return `${APP_URL.replace(/\/+$/, "")}/api/leads/unsubscribe?token=${encodeURIComponent(token)}`;
}

export interface SubscribeInput {
  nome: string;
  email: string;
  telefone?: string | null;
  whatsappOptIn?: boolean;
  origem?: string;
  ipAnon?: string | null;
}

/**
 * Registra (ou reativa) um lead e dispara o e-mail de confirmação (double
 * opt-in). Idempotente por e-mail. Nunca lança para o chamador por causa de
 * envio de e-mail — a rota pública sempre responde de forma genérica
 * (anti-enumeração). Endereços na lista de supressão são ignorados em silêncio.
 */
export async function subscribeLead(input: SubscribeInput): Promise<{ ok: boolean }> {
  const email = normalizeEmail(input.email);
  const nome = input.nome.trim().slice(0, 120);
  const telefone = input.telefone?.trim().slice(0, 40) || null;

  // Endereço com hard bounce/reclamação: não recadastra (protege reputação).
  if (await isEmailSuppressed(email)) return { ok: true };

  const existente = await prisma.newsletterLead.findUnique({
    where: { email },
    select: { id: true, status: true, token: true },
  });

  // Já confirmado: não reenvia (evita reengajamento abusivo). Silencioso.
  if (existente?.status === "confirmado") return { ok: true };

  const token = existente?.token ?? novoToken();
  const consentData = {
    nome,
    telefone,
    whatsappOptIn: input.whatsappOptIn ?? false,
    origem: input.origem ?? "landing",
    consentLGPD: true,
    consentEm: new Date(),
    consentVersao: CONSENT_VERSAO,
    ipAnon: input.ipAnon ?? null,
    status: "pendente" as const,
  };

  const lead = await prisma.newsletterLead.upsert({
    where: { email },
    create: { email, token, ...consentData },
    update: consentData,
    select: { id: true, nome: true, email: true, token: true },
  });

  logAction("lead_subscribed", undefined, undefined, { leadId: lead.id, origem: consentData.origem });

  await sendLeadOptInEmail({
    nome: lead.nome,
    email: lead.email,
    confirmUrl: confirmUrl(lead.token),
    unsubscribeUrl: unsubscribeUrl(lead.token),
  }).catch((err) => logError("leads/optin send", err));

  return { ok: true };
}

/**
 * Confirma o double opt-in a partir do token. Idempotente: reconfirmar um lead
 * já confirmado é sucesso silencioso (sem reenvio). Retorna o lead para a rota
 * poder redirecionar. Não confirma leads descadastrados (opt-out prevalece).
 */
export async function confirmLead(
  token: string
): Promise<{ ok: boolean; jaConfirmado?: boolean }> {
  const lead = await prisma.newsletterLead.findUnique({
    where: { token },
    select: { id: true, nome: true, email: true, status: true, token: true },
  });
  if (!lead || lead.status === "descadastrado") return { ok: false };

  if (lead.status === "confirmado") return { ok: true, jaConfirmado: true };

  await prisma.newsletterLead.update({
    where: { id: lead.id },
    data: { status: "confirmado", confirmadoEm: new Date() },
  });
  logAction("lead_confirmed", undefined, undefined, { leadId: lead.id });

  await sendLeadWelcomeEmail({
    nome: lead.nome,
    email: lead.email,
    unsubscribeUrl: unsubscribeUrl(lead.token),
  }).catch((err) => logError("leads/welcome send", err));

  return { ok: true };
}

/**
 * Descadastra um lead pelo token (opt-out 1-clique). Idempotente. Não polui a
 * lista global de supressão — leads só recebem e-mails disparados pelas próprias
 * ações, então marcar o status já basta para nunca mais contatá-los.
 */
export async function unsubscribeLead(token: string): Promise<{ ok: boolean }> {
  const lead = await prisma.newsletterLead.findUnique({
    where: { token },
    select: { id: true, status: true },
  });
  if (!lead) return { ok: false };

  if (lead.status !== "descadastrado") {
    await prisma.newsletterLead.update({
      where: { id: lead.id },
      data: { status: "descadastrado", descadastradoEm: new Date() },
    });
    logAction("lead_unsubscribed", undefined, undefined, { leadId: lead.id });
  }
  return { ok: true };
}
