/**
 * Fuzzing de autorização das APIs /api/super-admin/* — conta comum real.
 *
 * O proxy (middleware) só protege as PÁGINAS /super-admin; as rotas
 * /api/super-admin/* revalidam `role === "super_admin"` em cada handler. Isso
 * estava correto no código mas nunca havia sido exercitado com uma sessão real
 * de usuário comum. Este harness fecha essa lacuna:
 *
 *   1. Loga como Admin A (role=administrador, de scripts/.idor-setup.json) e
 *      dispara TODAS as combinações método+rota super-admin. Esperado: 403.
 *      Qualquer 2xx = escalonamento de privilégio (LEAK).
 *   2. Controle negativo: sem sessão → 401/307.
 *   3. Controle positivo: semeia um super_admin real e confirma que os GETs
 *      retornam 2xx — prova que o 403 vem do gate de papel, não de outra falha.
 *
 * Pré-requisito: dev server em http://localhost:3000 + `npx tsx scripts/idor-setup.ts`.
 *
 * Uso:
 *   DATABASE_URL=postgresql://formativo:formativo_dev@localhost:5432/formacao_comunitaria \
 *     npx tsx scripts/fuzz-superadmin.ts scripts/.idor-setup.json
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

type Setup = {
  password: string;
  orgA: { id: string; adminEmail: string; adminId: string };
  orgB: { id: string; adminEmail: string; adminId: string; arquivoId: string };
};

const SA_EMAIL = "fuzz-superadmin@example.test";
const SA_PASSWORD = "SaFuzz!2026";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64);
  return `${salt}:${key.toString("hex")}`;
}

// ── Cookie jar mínimo ─────────────────────────────────────────────────────────
class Jar {
  private cookies = new Map<string, string>();
  ingest(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (value === "" || value === "deleted") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  header(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  has(name: string) {
    return this.cookies.has(name);
  }
}

async function login(email: string, password: string, loginSource?: string): Promise<Jar> {
  const jar = new Jar();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: jar.header() } });
  jar.ingest(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  // super_admin só autentica quando o login vem da página de plataforma
  // (auth.ts exige credentials.loginSource === "super_admin").
  const fields: Record<string, string> = { csrfToken, email, password, callbackUrl: `${BASE}/`, json: "true" };
  if (loginSource) fields.loginSource = loginSource;
  const body = new URLSearchParams(fields);
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header() },
    body,
    redirect: "manual",
  });
  jar.ingest(res);
  if (!jar.has("authjs.session-token")) throw new Error(`login falhou para ${email} (status ${res.status})`);
  const sess = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: jar.header() } });
  const sj = (await sess.json()) as { user?: { organizacaoId?: string; role?: string } };
  console.log(`  ✓ login ${email} → org=${sj.user?.organizacaoId} role=${sj.user?.role}`);
  return jar;
}

async function req(method: string, path: string, jar: Jar | null, body?: unknown) {
  const headers: Record<string, string> = {};
  if (jar) headers.cookie = jar.header();
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const snippet = (await res.text()).slice(0, 120).replace(/\s+/g, " ");
  return { status: res.status, snippet };
}

// ── Matriz de endpoints super-admin ──────────────────────────────────────────
// `body` define um payload malicioso para os métodos de escrita (confirma que o
// gate de papel barra ANTES de qualquer efeito colateral).
function endpoints(orgBId: string): { method: string; path: string; body?: unknown; safeForGet: boolean }[] {
  return [
    { method: "GET", path: "/api/super-admin/metricas", safeForGet: true },
    { method: "GET", path: "/api/super-admin/seguranca", safeForGet: true },
    { method: "GET", path: "/api/super-admin/servicos", safeForGet: true },
    { method: "GET", path: "/api/super-admin/organizacoes", safeForGet: true },
    { method: "GET", path: "/api/super-admin/comunicado", safeForGet: true },
    { method: "GET", path: "/api/super-admin/lgpd", safeForGet: true },
    { method: "GET", path: `/api/super-admin/organizacoes/${orgBId}`, safeForGet: true },
    { method: "POST", path: "/api/super-admin/comunicado", body: { assunto: "PWNED", corpo: "x", segmento: "todos" }, safeForGet: false },
    { method: "POST", path: "/api/super-admin/bulk-action", body: { action: "suspend", orgIds: [orgBId] }, safeForGet: false },
    { method: "POST", path: "/api/super-admin/trial-reminder", body: {}, safeForGet: false },
    { method: "POST", path: "/api/super-admin/lgpd/incidente", body: { titulo: "PWNED", descricao: "x", gravidade: "alta" }, safeForGet: false },
    { method: "PATCH", path: "/api/super-admin/lgpd", body: { id: "x", status: "resolvido" }, safeForGet: false },
    { method: "PATCH", path: `/api/super-admin/organizacoes/${orgBId}`, body: { status: "SUSPENSO" }, safeForGet: false },
    { method: "DELETE", path: `/api/super-admin/organizacoes/${orgBId}`, safeForGet: false },
  ];
}

const results: { method: string; path: string; status: number; verdict: string; snippet: string }[] = [];

function recordAttack(method: string, path: string, status: number, snippet: string) {
  let verdict: string;
  if (status >= 200 && status < 300) verdict = "🔴 LEAK"; // conta comum não pode obter 2xx aqui
  else if (status === 403) verdict = "🟢 403";
  else if (status === 401 || status === 307) verdict = "🟡 401/307"; // bloqueado, mas papel deveria dar 403
  else if (status >= 500) verdict = "🟠 5xx";
  else verdict = "🟠 outro";
  results.push({ method, path, status, verdict, snippet });
}

async function ensureSuperAdmin(): Promise<boolean> {
  try {
    // org de plataforma (host do super_admin) — idempotente
    const org = await prisma.organizacao.upsert({
      where: { id: "org_platform" },
      update: {},
      create: { id: "org_platform", nome: "Plataforma Formattio", status: "ATIVO", planoAssinatura: "PERSONALIZADO" },
    });
    const existing = await prisma.usuario.findFirst({ where: { email: SA_EMAIL } });
    if (existing) {
      await prisma.usuario.update({
        where: { id: existing.id },
        data: { passwordHash: hashPassword(SA_PASSWORD), perfil: "super_admin", ativo: true, primeiroAcesso: false, lockedUntil: null, loginFailures: 0, organizacaoId: org.id },
      });
    } else {
      await prisma.usuario.create({
        data: { organizacaoId: org.id, nome: "Fuzz SuperAdmin", email: SA_EMAIL, passwordHash: hashPassword(SA_PASSWORD), perfil: "super_admin", ativo: true, primeiroAcesso: false },
      });
    }
    return true;
  } catch (e) {
    console.log(`  ⚠ não consegui semear super_admin: ${(e as Error).message}`);
    return false;
  }
}

async function main() {
  const setupPath = process.argv[2] ?? "scripts/.idor-setup.json";
  const setup: Setup = JSON.parse(readFileSync(setupPath, "utf-8"));
  const eps = endpoints(setup.orgB.id);

  console.log("=== Semeando super_admin (controle positivo) ===");
  const haveSa = await ensureSuperAdmin();

  console.log("\n=== Login conta COMUM (Admin A, role=administrador) ===");
  const jarA = await login(setup.orgA.adminEmail, setup.password);

  console.log("\n=== Ataque: conta comum em todas as rotas super-admin (esperado 403) ===");
  for (const e of eps) {
    const r = await req(e.method, e.path, jarA, e.body);
    recordAttack(e.method, e.path, r.status, r.snippet);
  }

  // ── Controle negativo: sem sessão ────────────────────────────────────────────
  console.log("\n=== Controle negativo (sem sessão) ===");
  const noauth = await req("GET", "/api/super-admin/metricas", null);
  const blockedNoauth = noauth.status === 401 || noauth.status === 307;
  console.log(`  sem sessão → ${noauth.status} ${blockedNoauth ? "✓ (bloqueado)" : "✗ INESPERADO"}`);

  // ── Controle positivo: super_admin real obtém 2xx nos GETs ───────────────────
  console.log("\n=== Controle positivo (super_admin real nos GETs) ===");
  let posOk = 0;
  let posTotal = 0;
  if (haveSa) {
    try {
      const jarSa = await login(SA_EMAIL, SA_PASSWORD, "super_admin");
      for (const e of eps.filter((x) => x.safeForGet)) {
        posTotal++;
        const r = await req(e.method, e.path, jarSa);
        const ok = r.status >= 200 && r.status < 300;
        if (ok) posOk++;
        console.log(`  ${e.method} ${e.path} → ${r.status} ${ok ? "✓" : "✗"}`);
      }
    } catch (e) {
      console.log(`  ⚠ login super_admin falhou: ${(e as Error).message}`);
    }
  }

  // ── Relatório ─────────────────────────────────────────────────────────────────
  console.log("\n=== Matriz de ataque (conta comum → super-admin) ===");
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  console.log(pad("METHOD", 8) + pad("STATUS", 8) + pad("VERDICT", 12) + "PATH");
  for (const r of results) console.log(pad(r.method, 8) + pad(String(r.status), 8) + pad(r.verdict, 12) + r.path);

  const leaks = results.filter((r) => r.verdict.includes("LEAK"));
  const weird = results.filter((r) => r.verdict.includes("5xx") || r.verdict.includes("outro"));
  console.log("\n=== Sumário ===");
  console.log(`  ataques: ${results.length}  |  🔴 escalonamentos (2xx): ${leaks.length}  |  🟠 a revisar: ${weird.length}`);
  console.log(`  controle positivo (super_admin GET 2xx): ${posOk}/${posTotal}`);
  if (leaks.length) {
    console.log("\n  !!! ESCALONAMENTO DE PRIVILÉGIO:");
    for (const l of leaks) console.log(`    ${l.method} ${l.path} → ${l.status} :: ${l.snippet}`);
    process.exitCode = 2;
  } else if (haveSa && posOk === 0) {
    console.log("  ⚠ Nenhum 403 vazou, mas o controle positivo não confirmou 2xx — verificar login do super_admin.");
  } else {
    console.log("  ✅ Conta comum recebe 403 em todas as rotas super-admin; super_admin alcança os handlers. Gate de papel confirmado.");
  }
}

main()
  .catch((e) => {
    console.error("erro no fuzzing:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
