/**
 * Server-side email template store backed by data/email-template.json.
 * NEVER import this module in client components — it uses Node.js 'fs'.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface TemplateStep {
  titulo: string;
  descricao: string;
}

export interface EmailTemplate {
  assunto: string;
  saudacao: string;
  mensagem1: string;
  mensagem2: string;
  passos: TemplateStep[];
  textoBotao: string;
  avisoSeguranca: string;
  rodape: string;
}

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplate = {
  assunto: "Bem-vindo(a) à Plataforma de Gestão da Formação Comunitária",
  saudacao: "Olá, {{primeiroNome}}!",
  mensagem1:
    "É com grande alegria que damos as boas-vindas à sua nova missão como Formador Comunitário na nossa plataforma de gestão da formação comunitária.",
  mensagem2:
    "A sua dedicação é fundamental para o crescimento e amadurecimento da nossa comunidade. Contamos com o seu compromisso e testemunho nesta bela missão.",
  passos: [
    {
      titulo: "Acesse a plataforma",
      descricao: "Clique no botão abaixo ou acesse o endereço da plataforma no seu navegador.",
    },
    {
      titulo: "Faça o login",
      descricao: "Utilize o e-mail {{email}} e a senha provisória indicada acima.",
    },
    {
      titulo: "Redefina a sua senha",
      descricao: "Na primeira entrada, será solicitado(a) a criar uma senha pessoal e segura.",
    },
    {
      titulo: "Explore a plataforma",
      descricao: "Após redefinir a senha, terá acesso completo à sua morada e aos formandos.",
    },
  ],
  textoBotao: "Acessar a Plataforma",
  avisoSeguranca:
    "⚠️ Atenção: A senha provisória é de uso único. Por segurança, deverá alterá-la no primeiro acesso. Não a partilhe com ninguém.",
  rodape: "Este é um e-mail automático — por favor, não responda a esta mensagem.",
};

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "email-template.json");

export function loadEmailTemplate(): EmailTemplate {
  if (existsSync(FILE)) {
    try {
      const raw = JSON.parse(readFileSync(FILE, "utf-8")) as Partial<EmailTemplate>;
      return {
        assunto: raw.assunto ?? DEFAULT_EMAIL_TEMPLATE.assunto,
        saudacao: raw.saudacao ?? DEFAULT_EMAIL_TEMPLATE.saudacao,
        mensagem1: raw.mensagem1 ?? DEFAULT_EMAIL_TEMPLATE.mensagem1,
        mensagem2: raw.mensagem2 ?? DEFAULT_EMAIL_TEMPLATE.mensagem2,
        passos: raw.passos?.length ? raw.passos : DEFAULT_EMAIL_TEMPLATE.passos,
        textoBotao: raw.textoBotao ?? DEFAULT_EMAIL_TEMPLATE.textoBotao,
        avisoSeguranca: raw.avisoSeguranca ?? DEFAULT_EMAIL_TEMPLATE.avisoSeguranca,
        rodape: raw.rodape ?? DEFAULT_EMAIL_TEMPLATE.rodape,
      };
    } catch { /* fall through to default */ }
  }
  return { ...DEFAULT_EMAIL_TEMPLATE, passos: [...DEFAULT_EMAIL_TEMPLATE.passos] };
}

export function saveEmailTemplate(template: EmailTemplate): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(template, null, 2), "utf-8");
}

export interface TemplateVars {
  nome: string;
  email: string;
  senha: string;
  url: string;
}

function applyVars(text: string, vars: TemplateVars): string {
  const primeiroNome = vars.nome.split(" ")[0];
  return text
    .replace(/\{\{primeiroNome\}\}/g, primeiroNome)
    .replace(/\{\{nome\}\}/g, vars.nome)
    .replace(/\{\{email\}\}/g, vars.email)
    .replace(/\{\{senha\}\}/g, vars.senha)
    .replace(/\{\{url\}\}/g, vars.url);
}

export function buildEmailHtml(template: EmailTemplate, vars: TemplateVars): string {
  const t = (text: string) => applyVars(text, vars);

  const stepsHtml = template.passos
    .map(
      (step, i) => `
      <tr>
        <td style="padding:8px 0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="top" style="padding-top:2px;">
                <span style="display:inline-block;width:26px;height:26px;background:#1d4ed8;border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#fff;">${i + 1}</span>
              </td>
              <td valign="top">
                <p style="margin:0;font-size:14px;font-weight:600;color:#1f2937;">${t(step.titulo)}</p>
                <p style="margin:2px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">${t(step.descricao)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t(template.assunto)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:40px 40px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.8);text-transform:uppercase;letter-spacing:1px;">Plataforma de Gestão</p>
              <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;line-height:1.2;">Formação Comunitária</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;font-size:16px;color:#1f2937;font-weight:600;">${t(template.saudacao)}</p>

              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                ${t(template.mensagem1)}
              </p>

              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
                ${t(template.mensagem2)}
              </p>

              <!-- Credentials box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;">Credenciais de Acesso</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #dbeafe;">
                          <span style="font-size:12px;color:#6b7280;display:block;">E-mail de acesso</span>
                          <span style="font-size:15px;color:#1f2937;font-weight:600;">${t("{{email}}")}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:12px 0 0;">
                          <span style="font-size:12px;color:#6b7280;display:block;">Senha provisória de primeiro acesso</span>
                          <span style="font-size:24px;color:#1d4ed8;font-weight:700;font-family:monospace;letter-spacing:4px;">${t("{{senha}}")}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1f2937;">Como concluir o seu cadastro:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${stepsHtml}
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${t("{{url}}")}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;">
                      ${t(template.textoBotao)}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:14px 16px;">
                    <p style="margin:0;font-size:13px;color:#92400e;">
                      ${t(template.avisoSeguranca)}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                Caso tenha dificuldades no acesso, entre em contacto com o administrador da plataforma.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                ${t(template.rodape)}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
