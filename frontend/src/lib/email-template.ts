// NEVER import in client components — uses Prisma (Node.js only).
import { prisma } from "@/lib/prisma";
import {
  renderEmail,
  heading,
  paragraph,
  codeBox,
  steps,
  button,
  callout,
  sectionLabel,
} from "@/lib/email-layout";

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
  assunto: "Bem-vindo(a) ao Formattio",
  saudacao: "Olá, {{primeiroNome}}!",
  mensagem1:
    "É com grande alegria que damos as boas-vindas à sua nova missão como Formador Comunitário no Formattio.",
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
      descricao: "Após redefinir a senha, terá acesso completo ao seu grupo de formação e aos formandos.",
    },
  ],
  textoBotao: "Acessar a Plataforma",
  avisoSeguranca:
    "Atenção: A senha provisória é de uso único. Por segurança, deverá alterá-la no primeiro acesso. Não a partilhe com ninguém.",
  rodape: "Este é um e-mail automático — por favor, não responda a esta mensagem.",
};

function parseTemplateJson(raw: unknown): EmailTemplate {
  const r = raw as Partial<EmailTemplate>;
  return {
    assunto: r.assunto ?? DEFAULT_EMAIL_TEMPLATE.assunto,
    saudacao: r.saudacao ?? DEFAULT_EMAIL_TEMPLATE.saudacao,
    mensagem1: r.mensagem1 ?? DEFAULT_EMAIL_TEMPLATE.mensagem1,
    mensagem2: r.mensagem2 ?? DEFAULT_EMAIL_TEMPLATE.mensagem2,
    passos: r.passos?.length ? r.passos : DEFAULT_EMAIL_TEMPLATE.passos,
    textoBotao: r.textoBotao ?? DEFAULT_EMAIL_TEMPLATE.textoBotao,
    avisoSeguranca: r.avisoSeguranca ?? DEFAULT_EMAIL_TEMPLATE.avisoSeguranca,
    rodape: r.rodape ?? DEFAULT_EMAIL_TEMPLATE.rodape,
  };
}

export async function loadEmailTemplate(organizacaoId: string): Promise<EmailTemplate> {
  try {
    const cfg = await prisma.configuracaoOrg.findUnique({
      where: { organizacaoId },
      select: { emailTemplate: true },
    });
    if (cfg?.emailTemplate) return parseTemplateJson(cfg.emailTemplate);
  } catch {
    // DB unavailable — fall through to default
  }
  return { ...DEFAULT_EMAIL_TEMPLATE, passos: [...DEFAULT_EMAIL_TEMPLATE.passos] };
}

export async function saveEmailTemplate(organizacaoId: string, template: EmailTemplate): Promise<void> {
  await prisma.configuracaoOrg.upsert({
    where: { organizacaoId },
    create: { organizacaoId, emailTemplate: template as object },
    update: { emailTemplate: template as object },
  });
}

export interface TemplateVars {
  nome: string;
  email: string;
  senha: string;
  url: string;
  /** URL absoluta do badge da marca para o cabeçalho. */
  logoUrl?: string;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function applyVars(text: string, vars: TemplateVars): string {
  const primeiroNome = escapeHtml(vars.nome.split(" ")[0]);
  const safeNome = escapeHtml(vars.nome);
  const safeEmail = escapeHtml(vars.email);
  const safeSenha = escapeHtml(vars.senha);
  const safeUrl = vars.url.startsWith("http://") || vars.url.startsWith("https://") ? escapeHtml(vars.url) : "#";
  return escapeHtml(text)
    .replace(/\{\{primeiroNome\}\}/g, primeiroNome)
    .replace(/\{\{nome\}\}/g, safeNome)
    .replace(/\{\{email\}\}/g, safeEmail)
    .replace(/\{\{senha\}\}/g, safeSenha)
    .replace(/\{\{url\}\}/g, safeUrl);
}

export function buildEmailHtml(template: EmailTemplate, vars: TemplateVars): string {
  const t = (text: string) => applyVars(text, vars);

  const passos = template.passos.map((step) => ({
    titulo: t(step.titulo),
    descricao: t(step.descricao),
  }));

  const conteudo = [
    heading(t(template.saudacao)),
    paragraph(t(template.mensagem1)),
    paragraph(t(template.mensagem2)),
    sectionLabel("Credenciais de acesso"),
    codeBox({
      label: "E-mail de acesso",
      value: t("{{email}}"),
      sublabel: "Senha provisória de primeiro acesso",
      subvalue: t("{{senha}}"),
    }),
    sectionLabel("Como concluir o seu cadastro"),
    steps(passos),
    button(t(template.textoBotao), vars.url),
    callout("warn", t(template.avisoSeguranca)),
    paragraph(
      "Caso tenha dificuldades no acesso, entre em contato com o administrador da plataforma."
    ),
  ].join("");

  const notaRodape =
    template.rodape && template.rodape !== DEFAULT_EMAIL_TEMPLATE.rodape
      ? t(template.rodape)
      : undefined;

  return renderEmail({
    titulo: t(template.assunto),
    conteudo,
    logoUrl: vars.logoUrl,
    notaRodape,
  });
}
