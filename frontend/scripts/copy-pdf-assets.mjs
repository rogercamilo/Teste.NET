// Copia os "standard fonts" do pdfjs-dist para public/pdfjs, servidos ao
// visualizador de PDF (react-pdf). Nossos PDFs usam Helvetica (fonte padrão do
// PDF, NÃO embarcada) — sem esses assets o pdf.js renderiza o texto aproximado.
// Idempotente; roda no predev/prebuild.
import { cp, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist", "standard_fonts");
const dest = join(root, "public", "pdfjs", "standard_fonts");

if (!existsSync(src)) {
  console.warn("[copy-pdf-assets] pdfjs-dist/standard_fonts não encontrado — pulando.");
  process.exit(0);
}

await mkdir(dest, { recursive: true });
await cp(src, dest, { recursive: true });
console.log("[copy-pdf-assets] standard_fonts → public/pdfjs/standard_fonts");
