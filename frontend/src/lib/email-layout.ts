// Layout e blocos de e-mail com a identidade visual do Formattio.
// Puro (sem Prisma / sem Node-only) — seguro para importar de qualquer lugar e testar.
//
// Linguagem de marca (Conceito H · Travessia): clay/terracota, warm white,
// institucional e acolhedor. Tabelas + estilos inline para máxima compatibilidade
// entre clientes de e-mail (Gmail, Apple Mail, Outlook). Sem flexbox/grid/oklch.

// ── Tokens (equivalentes HEX da paleta OKLCH em globals.css) ──────────────────
export const BRAND = {
  clay: "#B25433", // --primary
  clayDark: "#97442A", // hover/realce
  clayFog: "#F7EEE8", // superfície com tom clay
  clayFogBorder: "#E6CDBF",
  bg: "#FBF8F4", // --background (warm white)
  card: "#FFFFFF",
  ink: "#2A1E16", // --foreground
  inkSoft: "#5C5046", // texto secundário mais escuro
  muted: "#847A6F", // --muted-foreground
  surface: "#F7F2EC", // --muted (fundo neutro)
  border: "#E8E1D6", // --border
} as const;

const SEMANTIC = {
  info: { bg: "#F7EEE8", border: "#E6CDBF", text: "#7A3D24" },
  warn: { bg: "#FBF1DD", border: "#EBD49B", text: "#8A5A12" },
  danger: { bg: "#FAEAE7", border: "#E8B6AE", text: "#A12E20" },
  success: { bg: "#EAF3EC", border: "#B6D6BF", text: "#2F6B45" },
} as const;

export type CalloutVariant = keyof typeof SEMANTIC;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'Geist Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";

// ── Escaping ──────────────────────────────────────────────────────────────────
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/** Só aceita http(s); caso contrário devolve "#" (evita javascript:, etc.). */
export function safeUrl(url: string): string {
  return url.startsWith("http://") || url.startsWith("https://") ? escapeHtml(url) : "#";
}

// ── Blocos de conteúdo (retornam HTML para compor o corpo) ────────────────────

/** Parágrafo de corpo. `html` já deve estar escapado/seguro. */
export function paragraph(html: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.inkSoft};">${html}</p>`;
}

/** Saudação / título de seção dentro do corpo. */
export function heading(text: string): string {
  return `<p style="margin:0 0 16px;font-size:19px;font-weight:700;line-height:1.3;color:${BRAND.ink};">${text}</p>`;
}

/** Rótulo de seção (uppercase, pequeno). */
export function sectionLabel(text: string): string {
  return `<p style="margin:0 0 12px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${BRAND.clay};">${text}</p>`;
}

/** Botão de ação principal (clay). */
export function button(label: string, url: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
    <tr><td align="center">
      <a href="${safeUrl(url)}" style="display:inline-block;background:${BRAND.clay};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;">${label}</a>
    </td></tr>
  </table>`;
}

/** Link de fallback ("copie e cole..."). */
export function linkFallback(url: string): string {
  const u = safeUrl(url);
  return `<p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:${BRAND.muted};">Se o botão não funcionar, copie e cole este endereço no navegador:<br/><a href="${u}" style="color:${BRAND.clay};word-break:break-all;">${u}</a></p>`;
}

/** Caixa de credencial / código em destaque (e-mail + senha provisória, etc.). */
export function codeBox(opts: { label: string; value: string; sublabel?: string; subvalue?: string }): string {
  const sub = opts.sublabel
    ? `<tr><td style="padding-top:14px;">
         <span style="display:block;font-size:12px;color:${BRAND.muted};margin-bottom:4px;">${opts.sublabel}</span>
         <span style="display:block;font-size:24px;font-weight:700;font-family:${MONO};letter-spacing:3px;color:${BRAND.clay};">${opts.subvalue ?? ""}</span>
       </td></tr>`
    : "";
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.clayFog};border:1px solid ${BRAND.clayFogBorder};border-radius:12px;margin:0 0 24px;">
    <tr><td style="padding:20px 22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td>
          <span style="display:block;font-size:12px;color:${BRAND.muted};margin-bottom:4px;">${opts.label}</span>
          <span style="display:block;font-size:16px;font-weight:600;color:${BRAND.ink};">${opts.value}</span>
        </td></tr>
        ${sub}
      </table>
    </td></tr>
  </table>`;
}

/** Callout semântico (info/aviso/perigo/sucesso). `html` já seguro. */
export function callout(variant: CalloutVariant, html: string): string {
  const c = SEMANTIC[variant];
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;margin:0 0 20px;">
    <tr><td style="padding:14px 16px;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:${c.text};">${html}</p>
    </td></tr>
  </table>`;
}

/** Faixa de destaque no topo (ex.: "Aviso de segurança"). */
export function banner(variant: CalloutVariant, text: string): string {
  const c = SEMANTIC[variant];
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};border-left:4px solid ${c.border};border-radius:6px;margin:0 0 24px;">
    <tr><td style="padding:13px 16px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:${c.text};">${text}</p>
    </td></tr>
  </table>`;
}

/** Lista de passos numerados. */
export function steps(items: { titulo: string; descricao: string }[]): string {
  const rows = items
    .map(
      (s, i) => `
      <tr><td style="padding:6px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="36" valign="top" style="padding-top:1px;">
            <span style="display:inline-block;width:26px;height:26px;background:${BRAND.clay};border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#fff;">${i + 1}</span>
          </td>
          <td valign="top">
            <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND.ink};">${s.titulo}</p>
            <p style="margin:2px 0 0;font-size:13px;line-height:1.5;color:${BRAND.muted};">${s.descricao}</p>
          </td>
        </tr></table>
      </td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>`;
}

/** Lista de benefícios com check (clay). */
export function featureList(items: [string, string][]): string {
  const rows = items
    .map(
      ([feat, desc]) => `
      <tr>
        <td width="22" valign="top" style="padding:6px 0;"><span style="display:inline-block;width:7px;height:7px;margin-top:5px;border-radius:50%;background:${BRAND.clay};"></span></td>
        <td valign="top" style="padding:6px 8px;">
          <strong style="font-size:13px;color:${BRAND.ink};">${feat}</strong><br/>
          <span style="font-size:12px;color:${BRAND.muted};">${desc}</span>
        </td>
      </tr>`
    )
    .join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;margin:0 0 24px;">
    <tr><td style="padding:18px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
  </table>`;
}

/** Pares rótulo/valor (ex.: detalhes de incidente). `valor` já seguro. */
export function keyValues(rows: { label: string; value: string }[]): string {
  const body = rows
    .map(
      (r, i) => `
      <tr><td style="padding:${i === 0 ? "0" : "14px"} 0 0;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${BRAND.muted};text-transform:uppercase;letter-spacing:.04em;">${r.label}</p>
        <p style="margin:0;font-size:14px;line-height:1.5;color:${BRAND.ink};">${r.value}</p>
      </td></tr>`
    )
    .join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:12px;margin:0 0 24px;">
    <tr><td style="padding:18px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr>
  </table>`;
}

/** Caixa de preço (planos). */
export function priceBox(valor: string, sufixo: string, legenda: string): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.clayFog};border:1px solid ${BRAND.clayFogBorder};border-radius:12px;margin:0 0 24px;">
    <tr><td style="padding:18px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${BRAND.clay};">A partir de</p>
      <p style="margin:0;font-size:32px;font-weight:800;color:${BRAND.ink};">${valor}<span style="font-size:14px;font-weight:400;color:${BRAND.muted};">${sufixo}</span></p>
      <p style="margin:4px 0 0;font-size:12px;color:${BRAND.muted};">${legenda}</p>
    </td></tr>
  </table>`;
}

// ── Casca completa ────────────────────────────────────────────────────────────

export interface RenderEmailOptions {
  /** <title> e usado como preheader padrão se `preheader` não for informado. */
  titulo: string;
  /** Texto de preview na caixa de entrada (oculto no corpo). */
  preheader?: string;
  /** Eyebrow no cabeçalho. Padrão: "Plataforma Formativa". */
  eyebrow?: string;
  /** Conteúdo do corpo (composição dos blocos acima). */
  conteudo: string;
  /** Linha extra opcional no rodapé (acima do aviso padrão). */
  notaRodape?: string;
  /**
   * URL ABSOLUTA do badge do símbolo (PNG branco sobre clay). Quando informada,
   * o cabeçalho usa o lockup badge + wordmark; sem ela, cai no wordmark + trilha CSS.
   * Ex.: `https://www.formattio.com.br/brand/email/symbol-badge.png`.
   */
  logoUrl?: string;
}

/** Monta a URL absoluta do badge a partir da base da aplicação (NEXTAUTH_URL). */
export function brandLogoUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, "")}/brand/email/symbol-badge.png`;
}

/**
 * URL absoluta da logomarca horizontal colorida (lockup principal, PNG @2x
 * 512×128) usada no rodapé. Mesmo diretório do badge.
 */
export function brandWordmarkUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, "")}/brand/email/formattio-lockup-2x.png`;
}

/** Cabeçalho clay: badge + wordmark (com logo) ou wordmark + trilha CSS (sem logo). */
function renderHeader(eyebrow: string, logoUrl?: string): string {
  if (logoUrl) {
    return `
        <tr><td style="background:${BRAND.clay};padding:24px 36px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle" style="padding-right:14px;">
              <img src="${safeUrl(logoUrl)}" width="46" height="46" alt="Formattio" style="display:block;width:46px;height:46px;border-radius:11px;border:0;outline:none;text-decoration:none;" />
            </td>
            <td valign="middle">
              <div style="font-size:22px;font-weight:800;letter-spacing:-.4px;color:#ffffff;line-height:1.1;">Formattio</div>
              <div style="margin-top:3px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.72);">${escapeHtml(eyebrow)}</div>
            </td>
          </tr></table>
        </td></tr>`;
  }
  return `
        <tr><td style="background:${BRAND.clay};padding:26px 36px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.72);">${escapeHtml(eyebrow)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:22px;font-weight:800;letter-spacing:-.4px;color:#ffffff;">Formattio</td>
            <td style="padding-left:10px;" valign="middle">
              <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.45);"></span>
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.7);margin-left:3px;"></span>
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ffffff;margin-left:3px;"></span>
            </td>
          </tr></table>
        </td></tr>`;
}

const RODAPE_PADRAO = "Este é um e-mail automático — por favor, não responda a esta mensagem.";

/**
 * Dica de allowlisting no rodapé de TODOS os e-mails. Pedir para adicionar o
 * remetente aos contatos é um dos sinais mais fortes de "não é spam" para
 * Gmail/Outlook — treina o filtro a entregar na caixa de entrada. O endereço é o
 * remetente transacional canônico (`RESEND_FROM` = contato@formattio.com.br).
 */
const DICA_CONTATOS =
  'Para garantir o recebimento na caixa de entrada, adicione <strong>contato@formattio.com.br</strong> aos seus contatos.';

export function renderEmail(opts: RenderEmailOptions): string {
  const eyebrow = opts.eyebrow ?? "Plataforma Formativa";
  const preheader = opts.preheader ?? opts.titulo;
  const notaRodape = opts.notaRodape
    ? `<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${BRAND.muted};">${opts.notaRodape}</p>`
    : "";

  // Logomarca horizontal no rodapé (substitui o nome por extenso). Derivada do
  // badge (mesmo diretório /brand/email/); sem logoUrl, cai no wordmark textual.
  const wordmarkUrl = opts.logoUrl
    ? opts.logoUrl.replace(/symbol-badge\.png(\?.*)?$/, "formattio-lockup-2x.png")
    : undefined;
  const marcaRodape =
    wordmarkUrl && wordmarkUrl !== opts.logoUrl
      ? `<img src="${safeUrl(wordmarkUrl)}" width="156" height="39" alt="Formattio" style="display:inline-block;width:156px;height:39px;border:0;outline:none;text-decoration:none;margin:2px 0 6px;" />
          <p style="margin:0;font-size:12px;color:${BRAND.muted};">plataforma de gestão formativa</p>`
      : `<p style="margin:0;font-size:12px;color:${BRAND.muted};">Formattio — plataforma de gestão formativa</p>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <title>${escapeHtml(opts.titulo)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:${FONT};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">

        <!-- Cabeçalho -->
        ${renderHeader(eyebrow, opts.logoUrl)}

        <!-- Corpo -->
        <tr><td style="padding:34px 36px 30px;">${opts.conteudo}</td></tr>

        <!-- Rodapé -->
        <tr><td style="background:${BRAND.surface};border-top:1px solid ${BRAND.border};padding:22px 36px;text-align:center;">
          ${notaRodape}
          <p style="margin:0 0 6px;font-size:12px;line-height:1.5;color:${BRAND.muted};">${DICA_CONTATOS}</p>
          <p style="margin:0 0 10px;font-size:12px;color:${BRAND.muted};">${RODAPE_PADRAO}</p>
          ${marcaRodape}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}
