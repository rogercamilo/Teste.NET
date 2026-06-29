/**
 * Fuzzing real de upload + R2 — harness autenticado.
 *
 * Loga como Admin A (reaproveita scripts/.idor-setup.json), semeia um formando
 * próprio para os uploads ligados a entidade e dispara uma bateria de payloads
 * malformados/maliciosos contra cada superfície de upload e contra o serve do R2.
 *
 * Para cada caso há uma EXPECTATIVA (deve ser aceito vs. deve ser rejeitado).
 * O veredito compara o status real com a expectativa:
 *   - "reject" esperado + 4xx  → 🟢 ok (validação funcionou)
 *   - "reject" esperado + 2xx  → 🔴 GAP (payload malicioso aceito)
 *   - "accept" esperado + 2xx  → 🟢 ok (controle positivo)
 *   - qualquer 5xx             → 🟠 crash (entrada derruba o handler)
 *
 * Pré-requisito: dev server em http://localhost:3000 + `npx tsx scripts/idor-setup.ts`.
 *
 * Uso:
 *   npx tsx scripts/fuzz-upload.ts scripts/.idor-setup.json
 */
import { readFileSync } from "fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

type Setup = {
  password: string;
  orgA: { id: string; adminEmail: string; adminId: string };
  orgB: { id: string; adminEmail: string; adminId: string; arquivoId: string };
};

// ── Cookie jar mínimo (igual ao idor-test) ──────────────────────────────────
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

  const body = new URLSearchParams({ csrfToken, email, password, callbackUrl: `${BASE}/`, json: "true" });
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header() },
    body,
    redirect: "manual",
  });
  jar.ingest(res);
  if (!jar.has("authjs.session-token")) {
    throw new Error(`login falhou para ${email} (status ${res.status})`);
  }
  const sess = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: jar.header() } });
  const sj = (await sess.json()) as { user?: { organizacaoId?: string; role?: string } };
  if (!sj.user?.organizacaoId) throw new Error(`sessão sem organizacaoId para ${email}`);
  console.log(`  ✓ login ${email} → org=${sj.user.organizacaoId} role=${sj.user.role}`);
  return jar;
}

// ── Geradores de payload ─────────────────────────────────────────────────────
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function validPng(): Buffer {
  // PNG mínimo válido (1x1) — só precisamos do magic + algum corpo p/ os handlers
  return Buffer.concat([PNG_MAGIC, Buffer.from("IHDRfakebodyfakebodyfakebody")]);
}
function validPdf(): Buffer {
  return Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
}
function htmlXss(): Buffer {
  return Buffer.from('<html><script>alert(document.cookie)</script></html>');
}
function svgXss(): Buffer {
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
}
function oversized(mb: number): Buffer {
  return Buffer.alloc(mb * 1024 * 1024 + 1024, 0x41);
}

type Verdict = "🟢 ok" | "🔴 GAP" | "🟠 crash";
type Expect = "accept" | "reject";
const results: { surface: string; caso: string; expect: Expect; status: number; verdict: Verdict; note: string }[] = [];

function judge(expect: Expect, status: number): Verdict {
  if (status >= 500) return "🟠 crash";
  // sucesso = 2xx OU 3xx (serve do R2 responde 302 → presigned URL)
  const success = status >= 200 && status < 400;
  if (expect === "accept") return success ? "🟢 ok" : "🟠 crash";
  // expect reject
  return success ? "🔴 GAP" : "🟢 ok";
}

async function postMultipart(
  jar: Jar,
  path: string,
  parts: Record<string, string | { bytes: Buffer; filename: string; type: string }>
): Promise<{ status: number; snippet: string }> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(parts)) {
    if (typeof v === "string") fd.append(k, v);
    else fd.append(k, new Blob([new Uint8Array(v.bytes)], { type: v.type }), v.filename);
  }
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { cookie: jar.header() },
    body: fd,
    redirect: "manual",
  });
  const snippet = (await res.text()).slice(0, 140).replace(/\s+/g, " ");
  return { status: res.status, snippet };
}

async function patchMultipart(
  jar: Jar,
  path: string,
  parts: Record<string, string | { bytes: Buffer; filename: string; type: string }>
): Promise<{ status: number; snippet: string }> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(parts)) {
    if (typeof v === "string") fd.append(k, v);
    else fd.append(k, new Blob([new Uint8Array(v.bytes)], { type: v.type }), v.filename);
  }
  const res = await fetch(`${BASE}${path}`, { method: "PATCH", headers: { cookie: jar.header() }, body: fd, redirect: "manual" });
  const snippet = (await res.text()).slice(0, 140).replace(/\s+/g, " ");
  return { status: res.status, snippet };
}

function record(surface: string, caso: string, expect: Expect, status: number, note: string) {
  results.push({ surface, caso, expect, status, verdict: judge(expect, status), note });
}

async function create(jar: Jar, path: string, body: unknown): Promise<string | null> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { cookie: jar.header(), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status >= 200 && res.status < 300) {
    const j = (await res.json()) as { id?: string };
    return j.id ?? null;
  }
  return null;
}

async function reqRaw(method: string, path: string, jar: Jar | null) {
  const headers: Record<string, string> = {};
  if (jar) headers.cookie = jar.header();
  const res = await fetch(`${BASE}${path}`, { method, headers, redirect: "manual" });
  return { status: res.status };
}

async function main() {
  const setupPath = process.argv[2] ?? "scripts/.idor-setup.json";
  const setup: Setup = JSON.parse(readFileSync(setupPath, "utf-8"));

  console.log("=== Login ===");
  const jarA = await login(setup.orgA.adminEmail, setup.password);

  console.log("\n=== Seed: formando próprio (Org A) para uploads ligados a entidade ===");
  const formandoId = await create(jarA, "/api/formandos", { nome: "Fuzz Alvo", dataNascimento: "1990-01-01" });
  console.log(`  formandoId = ${formandoId ?? "(falhou — casos de arquivos/documentos serão pulados)"}`);

  // ── /api/imagens POST ───────────────────────────────────────────────────────
  console.log("\n=== Fuzzing /api/imagens POST ===");
  {
    let r = await postMultipart(jarA, "/api/imagens", { file: { bytes: validPng(), filename: "ok.png", type: "image/png" } });
    record("imagens", "PNG válido (controle)", "accept", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/imagens", { file: { bytes: htmlXss(), filename: "x.png", type: "image/png" } });
    record("imagens", "HTML/JS rotulado image/png (magic spoof)", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/imagens", { file: { bytes: validPdf(), filename: "x.png", type: "image/png" } });
    record("imagens", "PDF rotulado image/png (magic spoof)", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/imagens", { file: { bytes: svgXss(), filename: "x.svg", type: "image/svg+xml" } });
    record("imagens", "SVG c/ <script> (MIME fora da whitelist)", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/imagens", { file: { bytes: oversized(5), filename: "big.png", type: "image/png" } });
    record("imagens", "Imagem > 5MB", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/imagens", { file: { bytes: Buffer.alloc(0), filename: "empty.png", type: "image/png" } });
    record("imagens", "Arquivo vazio (0 bytes)", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/imagens", { naoEhFile: "abc" });
    record("imagens", "Campo 'file' ausente", "reject", r.status, r.snippet);
  }

  // ── /api/arquivos POST ────────────────────────────────────────────────────────
  if (formandoId) {
    console.log("\n=== Fuzzing /api/arquivos POST ===");
    const base = { entityType: "formando", entityId: formandoId };
    let r = await postMultipart(jarA, "/api/arquivos", { ...base, file: { bytes: validPdf(), filename: "ok.pdf", type: "application/pdf" } });
    record("arquivos", "PDF válido (controle)", "accept", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/arquivos", { ...base, file: { bytes: htmlXss(), filename: "x.pdf", type: "application/pdf" } });
    record("arquivos", "HTML rotulado application/pdf (magic mismatch)", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/arquivos", { ...base, file: { bytes: validPdf(), filename: "../../../../etc/passwd", type: "application/pdf" } });
    // O nome é só rótulo (storageKey é UUID server-side); deve ser sanitizado p/ basename.
    let nomeStored = "";
    try { nomeStored = (JSON.parse(r.snippet) as { nome?: string }).nome ?? ""; } catch { /* truncado */ }
    const sanitized = !nomeStored.includes("/") && !nomeStored.includes("..");
    record("arquivos", `Path traversal no filename (nome sanitizado→"${nomeStored}")`, "accept", sanitized ? r.status : 599, r.snippet);

    r = await postMultipart(jarA, "/api/arquivos", { ...base, file: { bytes: validPdf(), filename: "x".repeat(300) + ".pdf", type: "application/pdf" } });
    record("arquivos", "Nome > 255 chars", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/arquivos", { ...base, file: { bytes: oversized(10), filename: "big.pdf", type: "application/pdf" } });
    record("arquivos", "Arquivo > 10MB", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/arquivos", { entityType: "formando", entityId: "nonexistent-id", file: { bytes: validPdf(), filename: "ok.pdf", type: "application/pdf" } });
    record("arquivos", "entityId inexistente", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/arquivos", { entityType: "../escape", entityId: formandoId, file: { bytes: validPdf(), filename: "ok.pdf", type: "application/pdf" } });
    record("arquivos", "entityType inválido", "reject", r.status, r.snippet);
  }

  // ── /api/documentos POST ───────────────────────────────────────────────────────
  if (formandoId) {
    console.log("\n=== Fuzzing /api/documentos POST ===");
    // precisa de um EventoFormando (eventoId) válido — a FK Arquivo.eventoId aponta
    // para EventoFormando, não Agendamento.
    const today = new Date().toISOString().slice(0, 10);
    const eventoId = await create(jarA, "/api/eventos", { formandoId, tipo: "retiro", periodoInicio: today });
    const base = { eventoId: eventoId ?? "x", formandoId };
    let r = await postMultipart(jarA, "/api/documentos", { ...base, file: { bytes: validPdf(), filename: "ok.pdf", type: "application/pdf" } });
    record("documentos", `PDF válido (controle${eventoId ? "" : " — sem evento"})`, eventoId ? "accept" : "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/documentos", { ...base, file: { bytes: htmlXss(), filename: "x.pdf", type: "application/pdf" } });
    record("documentos", "HTML rotulado application/pdf (magic mismatch)", "reject", r.status, r.snippet);

    r = await postMultipart(jarA, "/api/documentos", { ...base, file: { bytes: oversized(10), filename: "big.pdf", type: "application/pdf" } });
    record("documentos", "Arquivo > 10MB", "reject", r.status, r.snippet);
  }

  // ── /api/imagens/serve GET (R2 retrieval / path traversal / cross-tenant) ──────
  console.log("\n=== Fuzzing /api/imagens/serve GET (R2) ===");
  {
    // primeiro sobe uma imagem válida para ter uma key real da própria org
    const up = await postMultipart(jarA, "/api/imagens", { file: { bytes: validPng(), filename: "serve.png", type: "image/png" } });
    let ownKey: string | null = null;
    try { ownKey = (JSON.parse(up.snippet) as { key?: string }).key ?? null; } catch { /* snippet truncado */ }

    if (ownKey) {
      const r = await reqRaw("GET", `/api/imagens/serve?key=${encodeURIComponent(ownKey)}`, jarA);
      record("serve/R2", "key própria válida (controle)", "accept", r.status, "ownKey");
    }
    let r = await reqRaw("GET", `/api/imagens/serve?key=${encodeURIComponent("org_" + setup.orgB.id + "/imagens/whatever.png")}`, jarA);
    record("serve/R2", "key de OUTRA org (cross-tenant)", "reject", r.status, "org B");

    r = await reqRaw("GET", `/api/imagens/serve?key=${encodeURIComponent("org_" + setup.orgA.id + "/../org_" + setup.orgB.id + "/x.png")}`, jarA);
    record("serve/R2", "path traversal '..' na key", "reject", r.status, "..");

    r = await reqRaw("GET", `/api/imagens/serve?key=${encodeURIComponent("/etc/passwd")}`, jarA);
    record("serve/R2", "key absoluta '/etc/passwd'", "reject", r.status, "abs");

    r = await reqRaw("GET", `/api/imagens/serve`, jarA);
    record("serve/R2", "key ausente", "reject", r.status, "empty");
  }

  // ── Relatório ───────────────────────────────────────────────────────────────────
  console.log("\n=== Matriz de fuzzing de upload/R2 ===");
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  console.log(pad("SURFACE", 12) + pad("STATUS", 8) + pad("VERDICT", 10) + "CASO");
  for (const r of results) {
    console.log(pad(r.surface, 12) + pad(String(r.status), 8) + pad(r.verdict, 10) + r.caso);
  }

  const gaps = results.filter((r) => r.verdict === "🔴 GAP");
  const crashes = results.filter((r) => r.verdict === "🟠 crash");
  console.log("\n=== Sumário ===");
  console.log(`  total de casos: ${results.length}`);
  console.log(`  🔴 gaps (payload malicioso aceito): ${gaps.length}`);
  console.log(`  🟠 crashes (5xx): ${crashes.length}`);
  if (gaps.length) {
    console.log("\n  !!! GAPS:");
    for (const g of gaps) console.log(`    [${g.surface}] ${g.caso} → ${g.status} :: ${g.note}`);
    process.exitCode = 2;
  }
  if (crashes.length) {
    console.log("\n  🟠 Crashes a investigar:");
    for (const c of crashes) console.log(`    [${c.surface}] ${c.caso} → ${c.status} :: ${c.note}`);
  }
  if (!gaps.length && !crashes.length) {
    console.log("  ✅ Toda entrada maliciosa foi rejeitada e nenhuma derrubou o handler.");
  }
}

main().catch((e) => {
  console.error("erro no fuzzing:", e);
  process.exit(1);
});
