/**
 * IDOR test harness — ataque.
 *
 * 1. Loga como Admin B, cria recursos reais via as APIs de POST (Org B).
 * 2. Loga como Admin A e tenta GET/PUT/DELETE em cada recurso da Org B.
 *    Esperado: SEMPRE 401/403/404. Qualquer 2xx = vazamento cross-tenant.
 * 3. Controles: A acessa o próprio recurso (deve dar 200) e acesso sem sessão
 *    (deve dar 401) — provam que o harness e a proteção funcionam.
 *
 * Pré-requisito: dev server em http://localhost:3000 e `npx tsx scripts/idor-setup.ts`.
 *
 * Uso:
 *   node --import tsx scripts/idor-test.ts <caminho-do-json-do-setup>
 */
import { readFileSync } from "fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

type Setup = {
  password: string;
  orgA: { id: string; adminEmail: string; adminId: string };
  orgB: { id: string; adminEmail: string; adminId: string; arquivoId: string };
};

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

async function login(email: string, password: string): Promise<Jar> {
  const jar = new Jar();
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: jar.header() } });
  jar.ingest(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const body = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/`,
    json: "true",
  });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header() },
    body,
    redirect: "manual",
  });
  jar.ingest(res);

  if (!jar.has("authjs.session-token")) {
    throw new Error(`login falhou para ${email} (status ${res.status}); sem session-token`);
  }
  // sanity: confirma identidade da sessão
  const sess = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: jar.header() } });
  const sj = (await sess.json()) as { user?: { organizacaoId?: string; role?: string } };
  if (!sj.user?.organizacaoId) throw new Error(`sessão sem organizacaoId para ${email}`);
  console.log(`  ✓ login ${email} → org=${sj.user.organizacaoId} role=${sj.user.role}`);
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
  let snippet = "";
  try {
    snippet = (await res.text()).slice(0, 120).replace(/\s+/g, " ");
  } catch {
    /* ignore */
  }
  return { status: res.status, snippet };
}

// cria recurso via POST e devolve o id (ou null se falhar)
async function create(jar: Jar, path: string, body: unknown, label: string): Promise<string | null> {
  const headers: Record<string, string> = { cookie: jar.header(), "content-type": "application/json" };
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  if (res.status >= 200 && res.status < 300) {
    const j = (await res.json()) as { id?: string };
    if (j.id) {
      console.log(`  ✓ seed ${label} → ${j.id}`);
      return j.id;
    }
  }
  const t = (await res.text()).slice(0, 160).replace(/\s+/g, " ");
  console.log(`  ⚠ não consegui semear ${label} (status ${res.status}): ${t}`);
  return null;
}

const results: { resource: string; method: string; path: string; status: number; verdict: string; snippet: string }[] = [];

function record(resource: string, method: string, path: string, status: number, snippet: string) {
  // Em ataque cross-tenant, só 401/403/404 são seguros. 2xx = VAZAMENTO. 5xx = suspeito.
  let verdict: string;
  if (status >= 200 && status < 300) verdict = "🔴 LEAK";
  else if ([401, 403, 404].includes(status)) verdict = "🟢 blocked";
  else if (status === 400 || status === 409 || status === 429) verdict = "🟡 rejected";
  else verdict = "🟠 check";
  results.push({ resource, method, path, status, verdict, snippet });
}

async function attack(resource: string, jarA: Jar, specs: { method: string; path: string; body?: unknown }[]) {
  for (const s of specs) {
    const r = await req(s.method, s.path, jarA, s.body);
    record(resource, s.method, s.path, r.status, r.snippet);
  }
}

async function main() {
  const setupPath = process.argv[2];
  if (!setupPath) throw new Error("informe o caminho do JSON do setup");
  const setup: Setup = JSON.parse(readFileSync(setupPath, "utf-8"));

  console.log("=== Login ===");
  const jarB = await login(setup.orgB.adminEmail, setup.password);
  const jarA = await login(setup.orgA.adminEmail, setup.password);

  console.log("\n=== Semeando recursos na Org B (via API, como Admin B) ===");
  const today = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const formandoId = await create(jarB, "/api/formandos", { nome: "Alvo B", dataNascimento: "1990-01-01" }, "formando");
  const grupoId = await create(jarB, "/api/grupos-formacao", { nome: "Grupo B" }, "grupoFormacao");
  const planoId = await create(jarB, "/api/planos", { nome: "Plano B" }, "plano");
  const formacaoId = await create(jarB, "/api/formacoes", { tema: "Formação B" }, "formacao");
  const gradeId = planoId
    ? await create(jarB, "/api/grades", { planoId, nome: "Grade B" }, "grade")
    : null;
  const agendamentoId = formacaoId
    ? await create(jarB, "/api/agendamentos", { formacaoId, dataInicio: nowIso }, "agendamento")
    : null;
  const eventoId = formandoId
    ? await create(jarB, "/api/eventos", { formandoId, tipo: "retiro", periodoInicio: today }, "evento")
    : null;
  const comentarioId = formandoId
    ? await create(jarB, "/api/comentarios", { formandoId, texto: "comentário B" }, "comentario")
    : null;
  const presencaId = agendamentoId && formandoId
    ? await create(jarB, "/api/presencas", { agendamentoId, formandoId, presente: true }, "presenca")
    : null;
  const relatorioId = formandoId
    ? await create(jarB, "/api/relatorios", { formandoId, nivelFormativo: "discipulado" }, "relatorio")
    : null;
  const processoId = formandoId
    ? await create(
        jarB,
        "/api/processos-eclesiasticos",
        { formandoId, tipo: "admissao_etapa", nivelFormativo: "discipulado" },
        "processo"
      )
    : null;

  // Controle positivo: A cria o próprio formando para confirmar que 200 é alcançável
  const formandoAId = await create(jarA, "/api/formandos", { nome: "Próprio A", dataNascimento: "1991-02-02" }, "formando-A(controle)");

  console.log("\n=== Atacando recursos da Org B com a sessão do Admin A ===");

  if (formandoId)
    await attack("formando", jarA, [
      { method: "GET", path: `/api/formandos/${formandoId}` },
      { method: "PUT", path: `/api/formandos/${formandoId}`, body: { nome: "HACKED" } },
      { method: "DELETE", path: `/api/formandos/${formandoId}` },
    ]);
  if (grupoId)
    await attack("grupoFormacao", jarA, [
      { method: "GET", path: `/api/grupos-formacao/${grupoId}` },
      { method: "PUT", path: `/api/grupos-formacao/${grupoId}`, body: { nome: "HACKED" } },
      { method: "DELETE", path: `/api/grupos-formacao/${grupoId}` },
    ]);
  if (planoId)
    await attack("plano", jarA, [
      { method: "GET", path: `/api/planos/${planoId}` },
      { method: "PUT", path: `/api/planos/${planoId}`, body: { nome: "HACKED" } },
      { method: "DELETE", path: `/api/planos/${planoId}` },
    ]);
  if (formacaoId)
    await attack("formacao", jarA, [
      { method: "GET", path: `/api/formacoes/${formacaoId}` },
      { method: "PUT", path: `/api/formacoes/${formacaoId}`, body: { tema: "HACKED" } },
      { method: "DELETE", path: `/api/formacoes/${formacaoId}` },
    ]);
  if (gradeId)
    await attack("grade", jarA, [
      { method: "GET", path: `/api/grades/${gradeId}` },
      { method: "DELETE", path: `/api/grades/${gradeId}` },
    ]);
  if (agendamentoId)
    await attack("agendamento", jarA, [
      { method: "GET", path: `/api/agendamentos/${agendamentoId}` },
      { method: "PUT", path: `/api/agendamentos/${agendamentoId}`, body: { local: "HACKED" } },
      { method: "DELETE", path: `/api/agendamentos/${agendamentoId}` },
    ]);
  if (eventoId)
    await attack("evento", jarA, [
      { method: "GET", path: `/api/eventos/${eventoId}` },
      { method: "DELETE", path: `/api/eventos/${eventoId}` },
    ]);
  if (comentarioId)
    await attack("comentario", jarA, [
      { method: "PUT", path: `/api/comentarios/${comentarioId}`, body: { texto: "HACKED" } },
      { method: "DELETE", path: `/api/comentarios/${comentarioId}` },
    ]);
  if (presencaId)
    await attack("presenca", jarA, [
      { method: "PUT", path: `/api/presencas/${presencaId}`, body: { presente: false } },
      { method: "DELETE", path: `/api/presencas/${presencaId}` },
    ]);
  if (relatorioId)
    await attack("relatorio", jarA, [
      { method: "GET", path: `/api/relatorios/${relatorioId}` },
      { method: "PUT", path: `/api/relatorios/${relatorioId}`, body: { textoNarrativo: "HACKED" } },
      { method: "POST", path: `/api/relatorios/${relatorioId}/finalizar`, body: {} },
    ]);
  if (processoId)
    await attack("processo", jarA, [{ method: "GET", path: `/api/processos-eclesiasticos/${processoId}` }]);

  await attack("arquivo", jarA, [
    { method: "GET", path: `/api/arquivos/${setup.orgB.arquivoId}` },
    { method: "DELETE", path: `/api/arquivos/${setup.orgB.arquivoId}` },
  ]);

  // Usuário da Org B
  await attack("user", jarA, [
    { method: "GET", path: `/api/users/${setup.orgB.adminId}` },
    { method: "PUT", path: `/api/users/${setup.orgB.adminId}`, body: { nome: "HACKED" } },
    { method: "DELETE", path: `/api/users/${setup.orgB.adminId}` },
  ]);

  // ── Controles ────────────────────────────────────────────────────────────────
  console.log("\n=== Controles ===");
  if (formandoAId) {
    const ok = await req("GET", `/api/formandos/${formandoAId}`, jarA);
    console.log(`  controle positivo (A lê próprio formando): ${ok.status} ${ok.status === 200 ? "✓" : "✗ INESPERADO"}`);
  }
  if (formandoId) {
    // Sem sessão, o proxy (middleware) redireciona para /login (307) antes de chegar à rota;
    // 401 (rota) e 307 (redirect de login) são ambos bloqueios válidos.
    const noauth = await req("GET", `/api/formandos/${formandoId}`, null);
    const blocked = noauth.status === 401 || noauth.status === 307;
    console.log(`  controle sem sessão (401 ou 307=redirect login): ${noauth.status} ${blocked ? "✓" : "✗ INESPERADO"}`);
  }

  // ── Relatório ─────────────────────────────────────────────────────────────────
  console.log("\n=== Matriz de resultados (ataque cross-tenant A→B) ===");
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  console.log(pad("RESOURCE", 16) + pad("METHOD", 8) + pad("STATUS", 8) + "VERDICT");
  for (const r of results) {
    console.log(pad(r.resource, 16) + pad(r.method, 8) + pad(String(r.status), 8) + r.verdict + "  " + r.path);
  }

  const leaks = results.filter((r) => r.verdict.includes("LEAK"));
  const checks = results.filter((r) => r.verdict.includes("check"));
  console.log("\n=== Sumário ===");
  console.log(`  total de tentativas: ${results.length}`);
  console.log(`  🔴 vazamentos (2xx): ${leaks.length}`);
  console.log(`  🟠 a investigar (5xx/outros): ${checks.length}`);
  if (leaks.length > 0) {
    console.log("\n  !!! VAZAMENTOS DETECTADOS:");
    for (const l of leaks) console.log(`    ${l.method} ${l.path} → ${l.status} :: ${l.snippet}`);
    process.exitCode = 2;
  } else {
    console.log("  ✅ Nenhum vazamento cross-tenant. Isolamento multi-tenant confirmado nas rotas testadas.");
  }
  if (checks.length > 0) {
    console.log("\n  Itens 🟠 para revisar manualmente:");
    for (const c of checks) console.log(`    ${c.method} ${c.path} → ${c.status} :: ${c.snippet}`);
  }
}

main().catch((e) => {
  console.error("erro no teste:", e);
  process.exit(1);
});
