// Gera o eBook de captura de leads (ímã) em PDF, a partir do HTML branded.
// Rodar de dentro de frontend/ (onde o playwright está instalado):
//   node ../_pdf_gen/gerar-ebook.mjs         → gera o PDF
//   node ../_pdf_gen/gerar-ebook.mjs --qa    → gera o PDF + screenshots de QA por página
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, mkdirSync, rmSync } from "fs";
import { createRequire } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// playwright vive em frontend/node_modules — resolve a partir dali.
const require = createRequire(join(ROOT, "frontend", "package.json"));
const { chromium } = require("playwright");

const INPUT = join(__dirname, "ebook-formattio.html");
const OUTPUT = join(ROOT, "frontend", "public", "materiais", "ebook-formattio.pdf");
const QA_DIR = join(__dirname, "qa");
const doQa = process.argv.includes("--qa");

if (!existsSync(INPUT)) {
  console.error("HTML não encontrado:", INPUT);
  process.exit(1);
}

console.log("Iniciando geração do eBook…");
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });

await page.goto("file:///" + INPUT.replace(/\\/g, "/"), { waitUntil: "networkidle" });

// Garante que as fontes (Google Fonts) carregaram antes de renderizar.
try {
  await page.evaluate(() => document.fonts.ready);
} catch {}
await page.waitForTimeout(1500);

if (doQa) {
  if (existsSync(QA_DIR)) rmSync(QA_DIR, { recursive: true, force: true });
  mkdirSync(QA_DIR, { recursive: true });
  const pages = await page.$$(".page");
  console.log(`QA: capturando ${pages.length} páginas…`);
  for (let i = 0; i < pages.length; i++) {
    const n = String(i + 1).padStart(2, "0");
    await pages[i].screenshot({ path: join(QA_DIR, `page-${n}.png`) });
  }
  console.log("QA screenshots em:", QA_DIR);
}

await page.pdf({
  path: OUTPUT,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: false,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});

await browser.close();
console.log("PDF gerado com sucesso:");
console.log(" ", OUTPUT);
