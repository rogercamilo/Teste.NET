/**
 * Testa o mecanismo de account lockout.
 * Usage: DATABASE_URL=... npx tsx scripts/test-lockout.ts
 *
 * O script:
 *  1. Reseta o estado do usuário (loginFailures=0, lockedUntil=null)
 *  2. Chama recordLoginFailure 5 vezes e verifica que a conta trava
 *  3. Verifica clearLoginFailures
 *  4. Testa via HTTP: 5 logins errados → 6º bloqueado por lockout
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL ?? "roger@formattio.com.br";
const WRONG_PASSWORD = "SenhaErrada@999";

// ── helpers ─────────────────────────────────────────────────────────────────

function ok(msg: string) { console.log(`  ✅ ${msg}`); }
function fail(msg: string) { console.log(`  ❌ ${msg}`); }
function info(msg: string) { console.log(`  ℹ  ${msg}`); }

async function resetUser(userId: string) {
  await prisma.usuario.update({
    where: { id: userId },
    data: { loginFailures: 0, lockedUntil: null },
  });
}

async function getUser(email: string) {
  return prisma.usuario.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deletedAt: null },
    select: { id: true, email: true, loginFailures: true, lockedUntil: true },
  });
}

// NextAuth CSRF requires that the csrfToken cookie matching the body token is sent in the POST.
// The proxy middleware may set an earlier authjs.csrf-token cookie (different value), so we
// must find the cookie that actually matches the body csrfToken.
async function getCsrfContext(): Promise<{ csrfToken: string; cookieHeader: string }> {
  const res = await fetch(`${BASE}/api/auth/csrf`);
  const data = await res.json() as { csrfToken: string };

  const allCookies: string[] = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") ?? "").split(/,(?=[^ ])/).map(s => s.trim());

  // The matching csrf cookie contains the exact csrfToken value in its value field
  const csrfCookie = allCookies
    .filter(c => c.includes("authjs.csrf-token"))
    .find(c => c.includes(data.csrfToken));
  const callbackCookie = allCookies.find(c => c.includes("authjs.callback-url"));

  const cookieHeader = [csrfCookie, callbackCookie]
    .filter(Boolean)
    .map(c => c!.split(";")[0])
    .join("; ");

  return { csrfToken: data.csrfToken, cookieHeader };
}

async function attemptLogin(email: string, password: string): Promise<{ status: number; url: string }> {
  const { csrfToken, cookieHeader } = await getCsrfContext();
  const body = new URLSearchParams({
    email,
    password,
    csrfToken,
    callbackUrl: `${BASE}/dashboard`,
    json: "true",
  });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookieHeader ? { "Cookie": cookieHeader } : {}),
    },
    body: body.toString(),
    redirect: "manual",
  });
  const location = res.headers.get("location") ?? "";
  return { status: res.status, url: location };
}

// ── DB-level test ─────────────────────────────────────────────────────────────

async function testDbLevelLockout(userId: string) {
  console.log("\n── Teste 1: Nível de banco de dados ──────────────────────────");

  await resetUser(userId);
  info("Estado resetado: loginFailures=0, lockedUntil=null");

  const MAX = 5;
  for (let i = 1; i <= MAX; i++) {
    await prisma.usuario.update({
      where: { id: userId },
      data: { loginFailures: { increment: 1 } },
    });
    const updated = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { loginFailures: true },
    });
    if ((updated?.loginFailures ?? 0) >= MAX) {
      await prisma.usuario.update({
        where: { id: userId },
        data: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
      });
    }
    info(`Falha ${i}: loginFailures=${updated?.loginFailures}`);
  }

  const after = await getUser(EMAIL);
  if (after && after.loginFailures >= MAX) {
    ok(`loginFailures=${after.loginFailures} (>= ${MAX})`);
  } else {
    fail(`loginFailures esperado >=${MAX}, obtido ${after?.loginFailures}`);
  }

  if (after?.lockedUntil && after.lockedUntil > new Date()) {
    ok(`lockedUntil definido: ${after.lockedUntil.toISOString()}`);
  } else {
    fail(`lockedUntil não foi definido ou já expirou: ${after?.lockedUntil}`);
  }

  // Test clear
  await prisma.usuario.update({
    where: { id: userId },
    data: { loginFailures: 0, lockedUntil: null },
  });
  const cleared = await getUser(EMAIL);
  if (cleared?.loginFailures === 0 && !cleared?.lockedUntil) {
    ok("clearLoginFailures: loginFailures=0, lockedUntil=null");
  } else {
    fail(`clearLoginFailures falhou: failures=${cleared?.loginFailures} locked=${cleared?.lockedUntil}`);
  }
}

// ── HTTP-level test ───────────────────────────────────────────────────────────

async function testHttpLevelLockout(userId: string) {
  console.log("\n── Teste 2: Nível HTTP (servidor deve estar em localhost:3000) ──");

  // Verifica se servidor está acessível
  try {
    await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
  } catch {
    fail("Servidor não acessível em localhost:3000 — pule este teste ou inicie npm run dev");
    return;
  }

  await resetUser(userId);
  info("Estado resetado para teste HTTP");

  const MAX_FAILURES = 5;

  for (let i = 1; i <= MAX_FAILURES; i++) {
    const { url } = await attemptLogin(EMAIL, WRONG_PASSWORD);
    const isError = url.includes("error=");
    info(`HTTP tentativa ${i}: ${isError ? "erro (esperado)" : "sucesso inesperado"} — ${url.split("?")[1] ?? ""}`);
  }

  // 6ª tentativa deve ser bloqueada por lockout (conta já travada)
  const { url } = await attemptLogin(EMAIL, WRONG_PASSWORD);

  const dbState = await getUser(EMAIL);
  info(`DB após 5 falhas: loginFailures=${dbState?.loginFailures} lockedUntil=${dbState?.lockedUntil?.toISOString() ?? "null"}`);

  if (dbState?.lockedUntil && dbState.lockedUntil > new Date()) {
    ok(`Conta bloqueada até ${dbState.lockedUntil.toISOString()}`);
  } else {
    fail(`Conta NÃO foi bloqueada — verificar implementação`);
  }

  if (url.includes("error=")) {
    ok(`6ª tentativa bloqueada (recebeu error na URL)`);
  } else {
    fail(`6ª tentativa não devolveu error: ${url}`);
  }

  // Limpa o estado para não deixar a conta bloqueada
  await resetUser(userId);
  ok("Estado resetado — conta desbloqueada para uso normal");
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== Teste de Account Lockout ===`);
  console.log(`Usuário: ${EMAIL}`);

  const user = await getUser(EMAIL);
  if (!user) {
    fail(`Usuário não encontrado: ${EMAIL}`);
    console.log("  → Defina TEST_EMAIL=seu@email.com");
    return;
  }
  info(`Usuário encontrado: id=${user.id}`);

  await testDbLevelLockout(user.id);
  await testHttpLevelLockout(user.id);

  console.log("\n=== Concluído ===\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
