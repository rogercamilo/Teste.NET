/**
 * Gera previews HTML dos e-mails migrados para a identidade Formattio.
 * Uso: npx tsx scripts/preview-emails.ts
 * Saída: scripts/email-previews/*.html (abra no navegador).
 *
 * Importa apenas email-layout.ts (puro, sem Prisma). Para o e-mail de
 * boas-vindas, replica a composição de buildEmailHtml com o template padrão.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  renderEmail,
  heading,
  paragraph,
  button,
  linkFallback,
  callout,
  codeBox,
  steps,
  sectionLabel,
  brandLogoUrl,
} from "../src/lib/email-layout";
import { DEFAULT_EMAIL_TEMPLATE } from "../src/lib/email-template";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "email-previews");
mkdirSync(outDir, { recursive: true });

// Aponta para o badge na URL pública (o mesmo cálculo usado em email.ts).
// Para ver o badge ao abrir o HTML, rode com o dev server no ar e use base local;
// caso contrário a imagem aponta para a URL de produção.
const APP_URL = process.env.NEXTAUTH_URL ?? "https://www.formattio.com.br";
const LOGO_URL = brandLogoUrl(APP_URL);

// ── Boas-vindas (espelha buildEmailHtml com o template padrão) ────────────────
const t = DEFAULT_EMAIL_TEMPLATE;
const welcome = renderEmail({
  titulo: t.assunto,
  logoUrl: LOGO_URL,
  conteudo: [
    heading("Olá, Maria!"),
    paragraph(t.mensagem1),
    paragraph(t.mensagem2),
    sectionLabel("Credenciais de acesso"),
    codeBox({
      label: "E-mail de acesso",
      value: "maria@comunidade.org",
      sublabel: "Senha provisória de primeiro acesso",
      subvalue: "X7K9-2P4M",
    }),
    sectionLabel("Como concluir o seu cadastro"),
    steps(t.passos),
    button(t.textoBotao, "http://localhost:3000/login"),
    callout("warn", t.avisoSeguranca),
    paragraph(
      "Caso tenha dificuldades no acesso, entre em contato com o administrador da plataforma."
    ),
  ].join(""),
});

// ── Recuperação de senha ──────────────────────────────────────────────────────
const passwordReset = renderEmail({
  titulo: "Recuperação de senha",
  preheader: "Redefina a senha da sua conta Formattio.",
  logoUrl: LOGO_URL,
  conteudo: [
    heading("Olá, Maria."),
    paragraph(
      "Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Formattio</strong>."
    ),
    paragraph(
      "Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>2 horas</strong>."
    ),
    button("Redefinir senha", "http://localhost:3000/redefinir-senha?token=demo"),
    linkFallback("http://localhost:3000/redefinir-senha?token=demo"),
    callout(
      "danger",
      "Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanece inalterada."
    ),
  ].join(""),
});

// ── Magic link do portal ──────────────────────────────────────────────────────
const portalMagic = renderEmail({
  titulo: "Seu link de acesso ao portal",
  preheader: "Acesse seu portal de formação — link válido por 15 minutos.",
  eyebrow: "Portal do Formando",
  logoUrl: LOGO_URL,
  conteudo: [
    heading("Olá, Maria!"),
    paragraph(
      "Recebemos uma solicitação de acesso ao seu portal de formação. Clique no botão abaixo para entrar."
    ),
    paragraph("O link é válido por <strong>15 minutos</strong>."),
    button("Acessar meu portal", "http://localhost:3000/portal?token=demo"),
    linkFallback("http://localhost:3000/portal?token=demo"),
    callout(
      "info",
      "Se não solicitou este acesso, ignore este e-mail. Nenhuma ação é necessária."
    ),
  ].join(""),
});

const files: [string, string][] = [
  ["01-boas-vindas.html", welcome],
  ["02-recuperacao-senha.html", passwordReset],
  ["03-portal-magic-link.html", portalMagic],
];
for (const [name, html] of files) {
  writeFileSync(join(outDir, name), html, "utf8");
  console.log("✓", join(outDir, name));
}
console.log("\nAbra os arquivos acima no navegador para validar a identidade visual.");
