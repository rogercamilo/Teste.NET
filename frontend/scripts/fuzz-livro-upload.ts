/**
 * Fuzzing do upload de PDF assinado do Livro de Registro.
 *
 * Fecha a ponta deixada pela rodada anterior: o PATCH multipart de
 * /api/livro-registro/tomos/[id] (anexar Termo de Abertura/Encerramento
 * assinado) ganhou limite de tamanho + magic bytes + quota, mas não havia sido
 * exercitado em runtime (exige org canônica + tomo aberto).
 *
 * Setup: habilita `vocacionalHabilitado` na org_idor_a (destrava o Livro), loga
 * como Admin A, garante um tomo aberto e ataca o PATCH com casos válidos e
 * maliciosos.
 *
 * Pré-requisito: dev server em http://localhost:3000 + `npx tsx scripts/idor-setup.ts`.
 *
 * Uso:
 *   DATABASE_URL=postgresql://formativo:formativo_dev@localhost:5432/formacao_comunitaria \
 *     npx tsx scripts/fuzz-livro-upload.ts scripts/.idor-setup.json
 */
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();

type Setup = { password: string; orgA: { id: string; adminEmail: string } };

class Jar {
  private c = new Map<string, string>();
  ingest(r: Response) { for (const ck of r.headers.getSetCookie()) { const [p] = ck.split(";"); const i = p.indexOf("="); const n = p.slice(0, i).trim(), v = p.slice(i + 1).trim(); if (v && v !== "deleted") this.c.set(n, v); else this.c.delete(n); } }
  header() { return [...this.c].map(([k, v]) => `${k}=${v}`).join("; "); }
  has(n: string) { return this.c.has(n); }
}

async function login(email: string, password: string): Promise<Jar> {
  const jar = new Jar();
  let r = await fetch(`${BASE}/api/auth/csrf`); jar.ingest(r);
  const { csrfToken } = (await r.json()) as { csrfToken: string };
  r = await fetch(`${BASE}/api/auth/callback/credentials`, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header() }, body: new URLSearchParams({ csrfToken, email, password, callbackUrl: `${BASE}/`, json: "true" }) });
  jar.ingest(r);
  if (!jar.has("authjs.session-token")) throw new Error(`login falhou (${r.status})`);
  return jar;
}

function validPdf(): Buffer {
  // > 12 bytes, começa com %PDF (exigido por assinaturaConfere)
  return Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
}
function htmlBytes(): Buffer { return Buffer.from("<html><script>alert(1)</script></html>"); }
function pngBytes(): Buffer { return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("body")]); }
function oversized(): Buffer { return Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(10 * 1024 * 1024 + 1024, 0x20)]); }

type Expect = "accept" | "reject";
const results: { caso: string; expect: Expect; status: number; verdict: string; snippet: string }[] = [];
function judge(expect: Expect, status: number): string {
  if (status >= 500) return "🟠 crash";
  const ok = status >= 200 && status < 300;
  if (expect === "accept") return ok ? "🟢 ok" : "🟠 falha";
  return ok ? "🔴 GAP" : "🟢 ok";
}

async function patchMultipart(jar: Jar, tomoId: string, parts: Record<string, string | { bytes: Buffer; type: string; filename: string }>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(parts)) {
    if (typeof v === "string") fd.append(k, v);
    else fd.append(k, new Blob([new Uint8Array(v.bytes)], { type: v.type }), v.filename);
  }
  const res = await fetch(`${BASE}/api/livro-registro/tomos/${tomoId}`, { method: "PATCH", headers: { cookie: jar.header(), origin: BASE }, body: fd, redirect: "manual" });
  const snippet = (await res.text()).slice(0, 140).replace(/\s+/g, " ");
  return { status: res.status, snippet };
}

function record(caso: string, expect: Expect, status: number, snippet: string) {
  results.push({ caso, expect, status, verdict: judge(expect, status), snippet });
}

async function main() {
  const setup: Setup = JSON.parse(readFileSync(process.argv[2] ?? "scripts/.idor-setup.json", "utf-8"));

  console.log("=== Setup: habilita vocacionalHabilitado na org A (destrava Livro) ===");
  await prisma.organizacao.update({ where: { id: setup.orgA.id }, data: { vocacionalHabilitado: true } });
  console.log("  ✓ org A vocacionalHabilitado=true");

  const jar = await login(setup.orgA.adminEmail, setup.password);
  console.log(`  ✓ login ${setup.orgA.adminEmail}`);

  // Garante um tomo aberto (controle positivo de que o guard/abertura funcionam)
  console.log("\n=== Garante um tomo aberto ===");
  const r = await fetch(`${BASE}/api/livro-registro/tomos`, { headers: { cookie: jar.header() } });
  const tomos = (await r.json()) as { id: string; status: string; numero: number }[];
  let aberto = Array.isArray(tomos) ? tomos.find((t) => t.status === "aberto") : undefined;
  if (!aberto) {
    const cr = await fetch(`${BASE}/api/livro-registro/tomos`, { method: "POST", headers: { cookie: jar.header(), "content-type": "application/json", origin: BASE }, body: JSON.stringify({ aberturaModerador: "Pe. Teste", aberturaSecretario: "Ir. Teste" }) });
    const cj = (await cr.json()) as { id: string; numero: number };
    if (cr.status !== 201) throw new Error(`não consegui abrir tomo (${cr.status}): ${JSON.stringify(cj)}`);
    aberto = { id: cj.id, status: "aberto", numero: cj.numero };
    console.log(`  ✓ tomo aberto via API → Tomo ${cj.numero} (${cj.id})`);
  } else {
    console.log(`  ✓ tomo aberto reaproveitado → Tomo ${aberto.numero} (${aberto.id})`);
  }
  const tomoId = aberto.id;

  console.log("\n=== Fuzzing PATCH multipart (anexar PDF assinado) ===");
  let x = await patchMultipart(jar, tomoId, { alvo: "abertura", arquivo: { bytes: validPdf(), type: "application/pdf", filename: "termo.pdf" } });
  record("PDF válido, alvo=abertura (controle)", "accept", x.status, x.snippet);

  x = await patchMultipart(jar, tomoId, { alvo: "encerramento", arquivo: { bytes: htmlBytes(), type: "application/pdf", filename: "x.pdf" } });
  record("HTML rotulado application/pdf (magic spoof)", "reject", x.status, x.snippet);

  x = await patchMultipart(jar, tomoId, { alvo: "abertura", arquivo: { bytes: pngBytes(), type: "image/png", filename: "x.png" } });
  record("PNG (type != application/pdf)", "reject", x.status, x.snippet);

  x = await patchMultipart(jar, tomoId, { alvo: "abertura", arquivo: { bytes: oversized(), type: "application/pdf", filename: "big.pdf" } });
  record("PDF > 10MB", "reject", x.status, x.snippet);

  x = await patchMultipart(jar, tomoId, { alvo: "lateral", arquivo: { bytes: validPdf(), type: "application/pdf", filename: "termo.pdf" } });
  record("alvo inválido", "reject", x.status, x.snippet);

  x = await patchMultipart(jar, tomoId, { alvo: "abertura", naoEhArquivo: "abc" });
  record("arquivo ausente", "reject", x.status, x.snippet);

  // ── Relatório ────────────────────────────────────────────────────────────────
  console.log("\n=== Matriz ===");
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  console.log(pad("STATUS", 8) + pad("VERDICT", 10) + "CASO");
  for (const r of results) console.log(pad(String(r.status), 8) + pad(r.verdict, 10) + r.caso);

  const gaps = results.filter((r) => r.verdict.includes("GAP"));
  const bad = results.filter((r) => r.verdict.includes("crash") || r.verdict.includes("falha"));
  console.log("\n=== Sumário ===");
  console.log(`  casos: ${results.length} | 🔴 gaps: ${gaps.length} | 🟠 falhas/crash: ${bad.length}`);
  if (gaps.length || bad.length) {
    for (const g of [...gaps, ...bad]) console.log(`  ${g.verdict} ${g.caso} → ${g.status} :: ${g.snippet}`);
    process.exitCode = 2;
  } else {
    console.log("  ✅ Upload do Livro: válido aceito, todo payload malicioso rejeitado, nenhum crash.");
  }
}

main().catch((e) => { console.error("erro:", e); process.exit(1); }).finally(() => prisma.$disconnect());
