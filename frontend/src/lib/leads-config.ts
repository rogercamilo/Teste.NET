/**
 * Configuração da captura de leads (ímã digital na landing). Os dois recursos
 * externos — o PDF do eBook e o link do Canal do WhatsApp — ainda estão
 * PENDENTES de material definitivo; ficam como placeholders sobrescrevíveis por
 * variável de ambiente para trocar sem novo deploy de código.
 */

/** Organização de plataforma usada nos envios de e-mail sem tenant (leads). */
export const PLATFORM_ORG_ID = process.env.PLATFORM_ORG_ID ?? "org_platform";

/**
 * URL do eBook entregue ao lead após a confirmação (double opt-in). Placeholder:
 * um PDF servido de `public/materiais/`. Trocar por `LEADS_EBOOK_URL` quando o
 * material definitivo existir (ex.: link do R2/CDN).
 */
export const EBOOK_URL =
  process.env.LEADS_EBOOK_URL ?? "/materiais/ebook-formattio.pdf";

/** Nome/título do eBook exibido na UI e nos e-mails. */
export const EBOOK_TITULO =
  process.env.LEADS_EBOOK_TITULO ?? "Organizando a formação da sua comunidade";

/**
 * Link do Canal (ou Comunidade de avisos) do WhatsApp — bônus da página de
 * obrigado, NÃO trava o eBook. Vazio = a seção de upsell não é exibida.
 * Preencher `LEADS_WHATSAPP_URL` quando o canal for criado.
 */
export const WHATSAPP_CHANNEL_URL = process.env.LEADS_WHATSAPP_URL ?? "";

/**
 * Versão do texto de consentimento LGPD aceito no formulário. Incrementar
 * sempre que o texto de consentimento mudar (rastreabilidade da base legal).
 */
export const CONSENT_VERSAO = "2026-07-07";

// ── Acesso antecipado (lead de vendas de alta intenção, /acesso-antecipado) ────

/**
 * Destinatário(s) do aviso interno de novo pedido de acesso antecipado. Lista
 * separada por vírgula aceita (vários e-mails da equipe). Cai em `contato@`
 * quando não configurado.
 */
export const ACESSO_ANTECIPADO_NOTIFY =
  process.env.LEADS_ACESSO_NOTIFY_EMAIL ?? "contato@formattio.com.br";

/**
 * Link de agendamento (Calendly/Cal.com) da conversa inicial — botão "Agendar
 * conversa" na página de obrigado. Vazio = o botão não é exibido (mesma postura
 * do Canal do WhatsApp: recurso externo plugável sem novo código).
 */
export const SCHEDULING_URL = process.env.LEADS_SCHEDULING_URL ?? "";

/**
 * Link direto de contato por WhatsApp (ex.: https://wa.me/55DDDNUMERO) — botão
 * "Falar no WhatsApp" na página de obrigado. DISTINTO do Canal de avisos
 * (WHATSAPP_CHANNEL_URL): aqui é conversa 1:1 com a equipe. Vazio = não exibido.
 */
export const CONTATO_WHATSAPP_URL = process.env.LEADS_CONTATO_WHATSAPP_URL ?? "";
