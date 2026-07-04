import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Matriz de autorização — guardrail estrutural sobre TODAS as rotas de API.
 *
 * Não prova correção semântica (para isso, pentest + testes de runtime). O que ela
 * garante é o CONTRATO mínimo de toda rota, pegando a regressão mais comum e mais
 * perigosa em SaaS multi-tenant: alguém adiciona/edita uma rota e esquece a
 * autenticação ou o escopo de tenant.
 *
 * Regras:
 *  1. Toda rota é OU pública (allowlist explícita) OU tem um mecanismo de auth.
 *  2. Rota que ESCREVE no banco referencia `organizacaoId` (salvo exceções explícitas
 *     — cross-org por design, self-service, público por token).
 *  3. Rota sob `super-admin/` checa o papel `super_admin`.
 *
 * Adicionar rota a uma allowlist é uma DECISÃO DE SEGURANÇA consciente e revisável no PR.
 */

const API_DIR = path.join(process.cwd(), "src/app/api");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name === "route.ts") out.push(p);
  }
  return out;
}

const routes = walk(API_DIR).map((abs) => {
  const rel = abs.replace(/\\/g, "/").split("/api/")[1]; // ex.: "formandos/[id]/route.ts"
  return { rel, src: fs.readFileSync(abs, "utf8") };
});

// Reconhece qualquer mecanismo de autenticação legítimo (sessão, guard, token, assinatura).
// `x-formando-*`: identidade do portal INJETADA pelo proxy após verificar o JWT `portal_session`
// (proxy.ts faz `requestHeaders.set(...)`, sobrescrevendo qualquer valor do cliente → não spoofável).
const AUTH_RE =
  /\bauth\s*\(\s*\)|require\w*Access|getPortalSession|verifyPortal\w*|portal_session|x-formando-|CRON_SECRET|stripe\.webhooks\.constructEvent|RESEND_WEBHOOK_SECRET|verifyResend\w*/;

// Rotas PÚBLICAS por design (mecanismo próprio ou sem dados sensíveis). Cada entrada é
// uma decisão de segurança: a rota foi revisada e não requer sessão de usuário.
const PUBLIC = new Set<string>([
  "auth/[...nextauth]/route.ts", // handler do NextAuth
  "health/route.ts", // liveness — só SELECT 1
  "public/branding/route.ts", // branding público da org (login/portal)
  "csp-report/route.ts", // browsers postam violações de CSP
  "registro/route.ts", // signup público (cria org)
  "convites/[token]/route.ts", // valida o próprio token do convite
  "auth/recuperar-senha/route.ts", // reset por e-mail (não vaza existência)
  "auth/recuperar-senha/confirmar/route.ts", // reset via token
  "push/subscribe-formando/route.ts", // ativa push do formando via tokenAssinatura
  "rsvp/[token]/route.ts", // RSVP 1-clique do formando via tokenAssinatura (deep link do lembrete)
  "portal/solicitar-acesso/route.ts", // formando pede magic link
  "portal/verificar/route.ts", // verifica magic link do portal
  "portal/login/route.ts", // login do formando por e-mail+senha (estabelece a sessão)
  "portal/ativar/[token]/route.ts", // 1º acesso: valida o próprio token e define a senha
  "portal/logout/route.ts", // só apaga o cookie de sessão do portal (sem dados/DB)
]);

// Detecta escrita no banco.
const WRITE_RE = /(?:prisma|tx)\.\w+\.(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\b/;

// Detecta consulta de LISTAGEM (vetor de sobre-exposição cross-tenant).
const LIST_RE = /\.findMany\(/;

// Rotas com findMany que legitimamente NÃO escopam por organizacaoId — cada uma justificada.
// (Todo o prefixo `super-admin/` é cross-org por design e já é role-gated — ver teste dedicado.)
const LIST_SCOPING_EXEMPT = new Set<string>([
  "cron/db-health/route.ts", // lista super_admins do sistema para alerta de pool (cron secret)
  "cron/security-alerts/route.ts", // lista super_admins do sistema para alerta de segurança (cron secret)
  "notificacoes/route.ts", // listarNaoLidas(userId) → where destinatarioId (escopo por usuário)
]);

// Rotas que escrevem mas NÃO escopam por organizacaoId — cada uma justificada.
const ORG_SCOPING_EXEMPT = new Set<string>([
  // Super-admin: opera cross-org por design (checagem super_admin cobre o acesso).
  "super-admin/organizacoes/[id]/route.ts",
  "super-admin/lgpd/route.ts",
  "super-admin/lgpd/incidente/route.ts",
  "super-admin/bulk-action/route.ts",
  "super-admin/comunicado/route.ts",
  "super-admin/trial-reminder/route.ts",
  // Self-service (escopo pelo próprio usuário/ator).
  "auth/change-password/route.ts",
  "auth/recuperar-senha/confirmar/route.ts",
  "auth/mfa/enable/route.ts",
  "auth/mfa/disable/route.ts",
  "auth/mfa/setup/route.ts",
  "conta/excluir/route.ts",
  "cookies/consent/route.ts",
  "notificacoes/route.ts",
  "notificacoes/[id]/route.ts",
  "push/subscribe/route.ts",
  "push/subscribe-formando/route.ts",
  // Público/token/assinatura (escopo por entidade específica, não por org da sessão).
  "registro/route.ts", // cria a org
  "convites/route.ts", // cria convite p/ própria org (usa organizacaoId, mas garantimos abaixo)
  "convites/[token]/route.ts", // aceita convite
  "webhooks/resend/route.ts", // por evento/e-mail
  "stripe/webhook/route.ts", // por customer/subscription
  "cron/db-health/route.ts",
  "admin/retention/route.ts", // job de retenção LGPD cross-org (CRON_SECRET + timingSafeEqual)
  // Portal do formando (escopo por sessão de portal / formando).
  "portal/solicitar-acesso/route.ts",
  "portal/presenca/[agendamentoId]/confirmar/route.ts",
  "portal/presenca/[agendamentoId]/justificar/route.ts",
  "portal/vocacional/solicitar-acompanhamento/route.ts",
]);

describe("matriz de autorização — contrato por rota", () => {
  it("existem rotas para auditar", () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it("toda rota não-pública possui mecanismo de autenticação", () => {
    const faltando = routes.filter((r) => !PUBLIC.has(r.rel) && !AUTH_RE.test(r.src)).map((r) => r.rel);
    expect(faltando, `Rotas sem auth reconhecível (adicione auth()/guard ou justifique em PUBLIC): ${faltando.join(", ")}`).toEqual([]);
  });

  it("toda rota que escreve no banco escopa por organizacaoId", () => {
    const faltando = routes
      .filter((r) => WRITE_RE.test(r.src) && !ORG_SCOPING_EXEMPT.has(r.rel) && !/organizacaoId/.test(r.src))
      .map((r) => r.rel);
    expect(faltando, `Rotas de escrita sem organizacaoId (escope por tenant ou justifique em ORG_SCOPING_EXEMPT): ${faltando.join(", ")}`).toEqual([]);
  });

  it("toda rota de listagem (findMany) escopa por organizacaoId", () => {
    const faltando = routes
      .filter((r) => LIST_RE.test(r.src) && !r.rel.startsWith("super-admin/") && !LIST_SCOPING_EXEMPT.has(r.rel) && !/organizacaoId/.test(r.src))
      .map((r) => r.rel);
    expect(faltando, `Rotas com findMany sem organizacaoId (escope a listagem por tenant ou justifique em LIST_SCOPING_EXEMPT): ${faltando.join(", ")}`).toEqual([]);
  });

  it("toda rota super-admin checa o papel super_admin", () => {
    const faltando = routes
      .filter((r) => r.rel.startsWith("super-admin/") && !/super_admin/.test(r.src))
      .map((r) => r.rel);
    expect(faltando, `Rotas super-admin sem checagem de super_admin: ${faltando.join(", ")}`).toEqual([]);
  });

  it("rotas públicas não fazem escrita sensível sem token próprio (sanidade da allowlist)", () => {
    // Garante que uma rota pública que escreve tenha ao menos um mecanismo de token/assinatura
    // reconhecível — evita allowlist virar buraco.
    const suspeitas = routes
      .filter((r) => PUBLIC.has(r.rel) && WRITE_RE.test(r.src))
      .filter((r) => !/token|Token|constructEvent|RESEND_WEBHOOK_SECRET|hash|scrypt|argon/.test(r.src))
      .map((r) => r.rel);
    expect(suspeitas, `Rotas públicas que escrevem sem token/assinatura aparente: ${suspeitas.join(", ")}`).toEqual([]);
  });
});
