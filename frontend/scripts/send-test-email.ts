/**
 * Envia e-mails de teste com a nova identidade Formattio para validação em
 * cliente real (Gmail/Outlook/Apple Mail).
 *
 * Uso:
 *   npx tsx scripts/send-test-email.ts [destino] [quais]
 *     destino : e-mail de destino (padrão: rogercmdb@gmail.com)
 *     quais   : all | welcome | invite | reset | credential | deletion |
 *               incident | planlimit | pushinvite | trial | limitalert |
 *               dbpool | comunicado | portal (padrão: all)
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
  banner,
  codeBox,
  keyValues,
  featureList,
  priceBox,
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
    invite: {
      subject: "[TESTE] Convite para Comunidade São José — Formattio",
      html: renderEmail({
        titulo: "Convite — Comunidade São José",
        preheader: "Você foi convidado(a) para a plataforma formativa de Comunidade São José.",
        logoUrl,
        notaRodape: "Se você não esperava este convite, pode ignorar este e-mail com segurança.",
        conteudo: [
          heading("Olá, Maria!"),
          paragraph(
            "Você foi convidado(a) para acessar a plataforma formativa da comunidade <strong>Comunidade São José</strong>."
          ),
          paragraph("Clique no botão abaixo para criar sua conta. O link expira em <strong>48 horas</strong>."),
          button("Aceitar convite", "https://www.formattio.com.br/convite?token=demo"),
          linkFallback("https://www.formattio.com.br/convite?token=demo"),
        ].join(""),
      }),
    },
    credential: {
      subject: "[TESTE] Redefinição de acesso — Comunidade São José",
      html: renderEmail({
        titulo: "Redefinição de acesso",
        eyebrow: "Segurança da Conta",
        logoUrl,
        conteudo: [
          heading("Redefinição de acesso"),
          paragraph("Olá, <strong>Maria</strong>."),
          paragraph(
            "O suporte da plataforma <strong>Formattio</strong> redefiniu as credenciais de acesso da organização <strong>Comunidade São José</strong> a pedido do responsável."
          ),
          paragraph(
            "Utilize a senha temporária abaixo para acessar a plataforma. Você será solicitado(a) a alterá-la imediatamente no primeiro acesso."
          ),
          codeBox({
            label: "Organização",
            value: "Comunidade São José",
            sublabel: "Senha temporária",
            subvalue: "X7K9-2P4M",
          }),
          button("Acessar a plataforma", "https://www.formattio.com.br/login"),
          callout(
            "danger",
            '<strong>Atenção:</strong> Se você não solicitou esta redefinição, entre em contato imediatamente com o suporte em <a href="mailto:suporte@formattio.com.br" style="color:inherit;">suporte@formattio.com.br</a>.'
          ),
        ].join(""),
      }),
    },
    deletion: {
      subject: "[TESTE] Sua conta Formattio foi encerrada",
      html: renderEmail({
        titulo: "Sua conta Formattio foi encerrada",
        eyebrow: "Privacidade e Dados",
        logoUrl,
        conteudo: [
          heading("Conta encerrada"),
          paragraph("Olá, <strong>Maria</strong>."),
          paragraph("Sua conta na plataforma <strong>Formattio</strong> foi encerrada conforme solicitado."),
          paragraph(
            "Seus dados pessoais foram anonimizados imediatamente. Logs de auditoria são mantidos por 12 meses conforme exigência legal."
          ),
          callout(
            "danger",
            'Se não solicitou esta exclusão, entre em contato imediatamente com <a href="mailto:privacidade@formattio.com.br" style="color:inherit;">privacidade@formattio.com.br</a>.'
          ),
        ].join(""),
      }),
    },
    incident: {
      subject: "[TESTE] Notificação de incidente de segurança — Comunidade São José",
      html: renderEmail({
        titulo: "Notificação de incidente de segurança",
        eyebrow: "Aviso de Segurança",
        logoUrl,
        conteudo: [
          banner("danger", "Notificação de incidente de segurança — LGPD Art. 48"),
          paragraph("Olá, <strong>Maria</strong>."),
          paragraph(
            "A organização <strong>Comunidade São José</strong>, em cumprimento ao Art. 48 da Lei Geral de Proteção de Dados (LGPD), notifica a ocorrência de um incidente de segurança que pode envolver seus dados pessoais."
          ),
          keyValues([
            { label: "Data do incidente", value: "15/06/2026" },
            { label: "Descrição", value: "Acesso indevido a relatório de presença de um grupo." },
            { label: "Medidas adotadas", value: "Revogação de tokens, rotação de credenciais e auditoria completa." },
          ]),
          paragraph(
            'Em caso de dúvidas, entre em contato com o responsável pela proteção de dados da sua organização ou com a equipe Formattio pelo e-mail <a href="mailto:privacidade@formattio.com.br" style="color:#B25433;">privacidade@formattio.com.br</a>.'
          ),
        ].join(""),
      }),
    },
    planlimit: {
      subject: "[TESTE] Limite do Plano Avançado atingido — conheça o Plano Personalizado",
      html: renderEmail({
        titulo: "Limite do Plano Avançado atingido",
        preheader: "Conheça o Plano Personalizado Formattio e cresça sem interrupções.",
        eyebrow: "Seu Plano",
        logoUrl,
        notaRodape: "Você recebeu este e-mail porque é administrador da organização Comunidade São José.",
        conteudo: [
          banner("warn", "Limite do Plano Avançado atingido — Comunidade São José"),
          paragraph("Olá!"),
          paragraph(
            "Sua organização <strong>Comunidade São José</strong> atingiu o limite de <strong>usuários ativos</strong> do <strong>Plano Avançado</strong>. Para continuar crescendo sem interrupções, convidamos você a conhecer o <strong>Plano Personalizado Formattio</strong>."
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
          button("Simular meu plano agora", "https://www.formattio.com.br/configuracoes?tab=plano"),
          '<p style="margin:0 0 8px;text-align:center;"><a href="mailto:contato@formattio.com.br" style="font-size:13px;color:#847A6F;text-decoration:underline;">Ou fale diretamente com nosso time</a></p>',
        ].join(""),
      }),
    },
    pushinvite: {
      subject: "[TESTE] Ative as notificações da sua comunidade — Formattio",
      html: renderEmail({
        titulo: "Ative as notificações da sua comunidade",
        preheader: "Receba avisos da sua comunidade mesmo com o navegador fechado.",
        eyebrow: "Notificações",
        logoUrl,
        notaRodape:
          "Sem spam. Apenas avisos da sua comunidade. Você pode cancelar a qualquer momento acessando o mesmo link.",
        conteudo: [
          heading("Ative as notificações, Maria!"),
          paragraph("Você está cadastrado(a) na plataforma de formação comunitária <strong>Formattio</strong>."),
          paragraph("Grupo de formação: <strong>Grupo Emaús</strong>"),
          paragraph(
            "Clique no botão abaixo para ativar as notificações no seu celular ou computador e receber avisos sobre encontros, datas e comunicados — mesmo com o navegador fechado."
          ),
          button("Ativar notificações", "https://www.formattio.com.br/ativar-notificacoes/demo"),
          linkFallback("https://www.formattio.com.br/ativar-notificacoes/demo"),
        ].join(""),
      }),
    },
    trial: {
      subject: "[TESTE] Seu período de experiência expira em 3 dias — Formattio",
      html: renderEmail({
        titulo: "Seu período de experiência expira em 3 dias",
        preheader: "Assine um plano antes de 26/06/2026 para não perder o acesso.",
        eyebrow: "Seu Plano",
        logoUrl,
        notaRodape: "Você recebeu este e-mail por ser administrador(a) da organização Comunidade São José.",
        conteudo: [
          banner("warn", "Período de experiência expira em 3 dias"),
          paragraph("Olá, <strong>Maria</strong>!"),
          paragraph(
            "O período de experiência da organização <strong>Comunidade São José</strong> na plataforma Formattio expira em <strong>26/06/2026</strong>."
          ),
          paragraph(
            "Para continuar utilizando todos os recursos sem interrupção, assine um dos planos antes da data de expiração."
          ),
          button("Escolher um plano", "https://www.formattio.com.br/configuracoes?tab=plano"),
          linkFallback("https://www.formattio.com.br/configuracoes?tab=plano"),
        ].join(""),
      }),
    },
    limitalert: {
      subject: "[TESTE] Alerta de limite — armazenamento em 85% (Comunidade São José)",
      html: renderEmail({
        titulo: "Alerta de uso",
        eyebrow: "Seu Plano",
        logoUrl,
        conteudo: [
          heading("Alerta de uso"),
          paragraph(
            "O recurso <strong>armazenamento</strong> da organização <strong>Comunidade São José</strong> está em <strong>85%</strong> do limite do plano atual."
          ),
          paragraph("Considere fazer upgrade do plano para evitar interrupções."),
          button("Gerenciar plano", "https://www.formattio.com.br/configuracoes"),
        ].join(""),
      }),
    },
    dbpool: {
      subject: "[TESTE] ⚠️ Pool de conexões em 86% — Formattio",
      html: renderEmail({
        titulo: "Pool de conexões em 86%",
        eyebrow: "Infraestrutura",
        logoUrl,
        notaRodape:
          "Você está recebendo este alerta porque é administrador da plataforma. Novo alerta só será enviado após algumas horas, mesmo que a condição persista.",
        conteudo: [
          banner("danger", "⚠️ Pool de conexões do banco em 86%"),
          paragraph("Olá, Roger."),
          paragraph(
            "O PostgreSQL está usando <strong>43 de 50</strong> conexões disponíveis (<strong>86%</strong>), acima do limite de alerta de 80%."
          ),
          paragraph(
            "Sob carga sustentada perto do limite, novas conexões podem falhar. Recomenda-se adotar um <strong>connection pooler</strong> (PgBouncer em modo transaction ou Prisma Accelerate) ou revisar o <code>DATABASE_POOL_SIZE</code> por réplica."
          ),
          button("Ver infraestrutura", "https://www.formattio.com.br/super-admin?tab=infraestrutura"),
        ].join(""),
      }),
    },
    comunicado: {
      subject: "[TESTE] Novidades da plataforma Formattio",
      html: renderEmail({
        titulo: "Novidades da plataforma Formattio",
        eyebrow: "Comunicado",
        logoUrl,
        notaRodape:
          "Esta mensagem foi enviada para os administradores de <strong>Comunidade São José</strong> pela equipe Formattio.",
        conteudo: [
          heading("Olá, Maria!"),
          paragraph(
            "Temos novidades por aqui: os e-mails da plataforma agora seguem a identidade visual do Formattio.<br/>Em breve traremos mais melhorias para a sua jornada formativa.<br/>Obrigado por caminhar conosco!"
          ),
        ].join(""),
      }),
    },
  };

  const selecionados =
    quais === "all" ? Object.keys(emails) : [quais].filter((k) => k in emails);
  if (selecionados.length === 0) {
    console.error(`Tipo inválido: "${quais}". Use: all | ${Object.keys(emails).join(" | ")}`);
    process.exit(1);
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const address = process.env.RESEND_FROM ?? "contato@formattio.com.br";
  // Demonstra a identidade do remetente (mesma lógica de email.ts):
  // e-mails da comunidade saem com o nome da org + reply-to do admin;
  // e-mails de plataforma (dbpool, comunicado) saem como "Formattio".
  const PLATAFORMA = new Set(["dbpool", "comunicado"]);
  const ORG_NAME = "Comunidade São José";
  const ORG_REPLY = "secretaria.saojose@exemplo.org";
  console.log(`\nEnviando para "${destino}":`);
  for (const k of selecionados) {
    const { subject, html } = emails[k];
    const platform = PLATAFORMA.has(k);
    const fromName = platform ? "Formattio" : ORG_NAME;
    const replyTo = platform ? "contato@formattio.com.br" : ORG_REPLY;
    const { error } = await resend.emails.send({
      from: `"${fromName}" <${address}>`,
      to: destino,
      subject,
      html,
      replyTo,
    });
    if (error) console.error(`  ✗ ${k}: ${error.message}`);
    else console.log(`  ✓ ${k} — de "${fromName}" · reply-to ${replyTo}`);
  }
  console.log("\nConfira a caixa de entrada (e a pasta de spam).");
})();
