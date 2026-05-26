/**
 * Client-side text extraction from PDF and DOCX files.
 * Uses pdfjs-dist (PDF) and mammoth (DOCX) via dynamic imports
 * so neither library is bundled into the initial page load.
 */

async function extractTextFromPdf(dataUrl: string): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const maxPages = Math.min(pdf.numPages, 5);
  const parts: string[] = [];

  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    parts.push(pageText);
  }

  return parts.join("\n\n");
}

async function extractTextFromDocx(dataUrl: string): Promise<string> {
  const mammoth = await import("mammoth");
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const result = await mammoth.extractRawText({ arrayBuffer: bytes.buffer as ArrayBuffer });
  return result.value;
}

/**
 * Parses raw text from a formation document and returns the most likely
 * "objetivos" and "fundamentação" values.
 *
 * Strategy:
 * 1. Search for labeled sections (keywords "objetivo" / "fundamenta").
 * 2. Fall back to the first two substantial paragraphs that come after a
 *    title-like block at the top of the document.
 */
export function parseFormativeContent(text: string): {
  objetivos: string;
  fundamentacao: string;
} {
  // Normalise line endings and collapse runs of blank lines
  const norm = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // --- Attempt labelled-section extraction ---
  // Match "Objetivo(s):" or "Objetivo(s)" on its own line, capture until next header
  const headerPattern =
    /\n?\s*(?:objetivos?|finalidade[s]?)\s*[:\-]?\s*\n/i;
  const fundPattern =
    /\n?\s*fundamenta(?:ção|cao|ção|c[aã]o)\s*[:\-]?\s*\n/i;

  const nextHeaderPattern =
    /\n\s*(?:fundamenta|metodologia|conte[uú]do|eixo[s]?|estrutura|p[uú]blico|etapa[s]?|programa|cronograma)/i;

  function extractSection(start: RegExp): string {
    const match = norm.match(start);
    if (!match || match.index === undefined) return "";
    const after = norm.slice(match.index + match[0].length);
    const nextMatch = after.match(nextHeaderPattern);
    const section = nextMatch ? after.slice(0, nextMatch.index) : after.slice(0, 1000);
    return section
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join(" ")
      .slice(0, 600)
      .trim();
  }

  let objetivos = extractSection(headerPattern);
  let fundamentacao = extractSection(fundPattern);

  // --- Fallback: first two substantial paragraphs ---
  if (!objetivos || !fundamentacao) {
    const paragraphs = norm
      .split(/\n\n+/)
      .map((p) => p.replace(/\n/g, " ").trim())
      // Skip very short lines (likely titles, page numbers, headers)
      .filter((p) => p.length > 80 && !/^\d+$/.test(p));

    // Skip the very first block if it looks like a title (short, ALL CAPS or ends with year)
    const bodyParagraphs =
      paragraphs[0] && paragraphs[0].length < 120
        ? paragraphs.slice(1)
        : paragraphs;

    if (!objetivos && bodyParagraphs[0]) {
      objetivos = bodyParagraphs[0].slice(0, 600);
    }
    if (!fundamentacao && bodyParagraphs[1]) {
      fundamentacao = bodyParagraphs[1].slice(0, 600);
    }
  }

  return { objetivos, fundamentacao };
}

export interface ExtractedFields {
  objetivos: string;
  fundamentacao: string;
  dataUrl: string;
}

/**
 * Reads a File, extracts its text content, and returns both the
 * base64 data URL (for storage / viewing) and the parsed form fields.
 */
export async function extractDocumentFields(
  file: File
): Promise<ExtractedFields> {
  // Read as data URL (needed for storage and PDF viewer)
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target!.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const lower = file.name.toLowerCase();
  let rawText = "";

  try {
    if (lower.endsWith(".pdf")) {
      rawText = await extractTextFromPdf(dataUrl);
    } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
      rawText = await extractTextFromDocx(dataUrl);
    }
  } catch {
    // Extraction failed — caller receives empty strings and can proceed without pre-fill
  }

  const { objetivos, fundamentacao } = rawText
    ? parseFormativeContent(rawText)
    : { objetivos: "", fundamentacao: "" };

  return { objetivos, fundamentacao, dataUrl };
}
