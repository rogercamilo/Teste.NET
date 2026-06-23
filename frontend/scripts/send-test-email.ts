/**
 * Envia e-mails de teste com a nova identidade Formattio para validação em
 * cliente real (Gmail/Outlook/Apple Mail).
 *
 * Uso:
 *   npx tsx scripts/send-test-email.ts [destino] [quais]
 *     destino : e-mail de destino (padrão: rogercmdb@gmail.com)
 *     quais   : all | welcome | reset | portal (padrão: all)
 *
 * O badge é enviado ao R2 e referenciado por uma URL assinada (7 dias), para
 * renderizar sem depender de deploy. Envia via Resend (RESEND_API_KEY).
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";
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
} from "../src/lib/email-layout";

config({ path: ".env.local" });

const here = dirname(fileURLToPath(import.meta.url));
const destino = process.argv[2] || "rogercmdb@gmail.com";
const quais = (process.argv[3] || "all").toLowerCase();

// Template padrão de boas-vindas (espelha DEFAULT_EMAIL_TEMPLATE em email-template.ts).
const WELCOME = {
  assunto: "Bem-vindo(a) ao Formattio",
  mensagem1:
    "É com grande alegria que damos as boas-vindas à sua nova missão como Formador Comunitário no Formattio.",
  mensagem2:
    "A sua dedicação é fundamental para o crescimento e amadurecimento da nossa comunidade. Contamos com o seu compromisso e testemunho nesta bela missão.",
  passos: [
    { titulo: "Acesse a plataforma", descricao: "Clique no botão abaixo ou acesse o endereço da plataforma no seu navegador." },
    { titulo: "Faça o login", descricao: "Utilize o e-mail maria@comunidade.org e a senha provisória indicada acima." },
    { titulo: "Redefina a sua senha", descricao: "Na primeira entrada, será solicitado(a) a criar uma senha pessoal e segura." },
    { titulo: "Explore a plataforma", descricao: "Após redefinir a senha, terá acesso completo ao seu grupo de formação e aos formandos." },
  ],
  textoBotao: "Acessar a Plataforma",
  avisoSeguranca:
    "⚠️ Atenção: A senha provisória é de uso único. Por segurança, deverá alterá-la no primeiro acesso. Não a partilhe com ninguém.",
};

async function uploadBadgeToR2(): Promise<string | undefined> {
  const account = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!account || !bucket || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.warn("⚠ R2 não configurado — enviando com header textual (fallback).");
    return undefined;
  }
  const { S3Client, PutObjectCommand, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${account}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  const key = "brand-test/email/symbol-badge.png";
  const body = readFileSync(join(here, "../public/brand/email/symbol-badge.png"));
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "image/png" })
  );
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: 7 * 24 * 3600,
  });
}

(async () => {
  let logoUrl: string | undefined;
  try {
    logoUrl = await uploadBadgeToR2();
    if (logoUrl) console.log("✓ badge no R2 (URL assinada 7 dias gerada)");
  } catch (e) {
    console.warn("⚠ falha no R2 — header textual:", e instanceof Error ? e.message : e);
  }

  const emails: Record<string, { subject: string; html: string }> = {
    welcome: {
      subject: "[TESTE] " + WELCOME.assunto,
      html: renderEmail({
        titulo: WELCOME.assunto,
        logoUrl,
        conteudo: [
          heading("Olá, Maria!"),
          paragraph(WELCOME.mensagem1),
          paragraph(WELCOME.mensagem2),
          sectionLabel("Credenciais de acesso"),
          codeBox({
            label: "E-mail de acesso",
            value: "maria@comunidade.org",
            sublabel: "Senha provisória de primeiro acesso",
            subvalue: "X7K9-2P4M",
          }),
          sectionLabel("Como concluir o seu cadastro"),
          steps(WELCOME.passos),
          button(WELCOME.textoBotao, "https://www.formattio.com.br/login"),
          callout("warn", WELCOME.avisoSeguranca),
          paragraph(
            "Caso tenha dificuldades no acesso, entre em contato com o administrador da plataforma."
          ),
        ].join(""),
      }),
    },
    reset: {
      subject: "[TESTE] Recuperação de senha — Formattio",
      html: renderEmail({
        titulo: "Recuperação de senha",
        preheader: "Redefina a senha da sua conta Formattio.",
        logoUrl,
        conteudo: [
          heading("Olá, Maria."),
          paragraph(
            "Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Formattio</strong>."
          ),
          paragraph(
            "Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>2 horas</strong>."
          ),
          button("Redefinir senha", "https://www.formattio.com.br/redefinir-senha?token=demo"),
          linkFallback("https://www.formattio.com.br/redefinir-senha?token=demo"),
          callout(
            "danger",
            "Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanece inalterada."
          ),
        ].join(""),
      }),
    },
    portal: {
      subject: "[TESTE] Seu link de acesso ao portal — Formattio",
      html: renderEmail({
        titulo: "Seu link de acesso ao portal",
        preheader: "Acesse seu portal de formação — link válido por 15 minutos.",
        eyebrow: "Portal do Formando",
        logoUrl,
        conteudo: [
          heading("Olá, Maria!"),
          paragraph(
            "Recebemos uma solicitação de acesso ao seu portal de formação. Clique no botão abaixo para entrar."
          ),
          paragraph("O link é válido por <strong>15 minutos</strong>."),
          button("Acessar meu portal", "https://www.formattio.com.br/portal?token=demo"),
          linkFallback("https://www.formattio.com.br/portal?token=demo"),
          callout(
            "info",
            "Se não solicitou este acesso, ignore este e-mail. Nenhuma ação é necessária."
          ),
        ].join(""),
      }),
    },
  };

  const selecionados =
    quais === "all" ? ["welcome", "reset", "portal"] : [quais].filter((k) => k in emails);
  if (selecionados.length === 0) {
    console.error(`Tipo inválido: "${quais}". Use: all | welcome | reset | portal`);
    process.exit(1);
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const from = process.env.RESEND_FROM ?? "contato@formattio.com.br";
  console.log(`\nEnviando de "${from}" para "${destino}":`);
  for (const k of selecionados) {
    const { subject, html } = emails[k];
    const { error } = await resend.emails.send({ from, to: destino, subject, html });
    if (error) console.error(`  ✗ ${k}: ${error.message}`);
    else console.log(`  ✓ ${k} enviado`);
  }
  console.log("\nConfira a caixa de entrada (e a pasta de spam).");
})();
