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
