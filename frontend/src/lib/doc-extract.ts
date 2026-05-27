async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Cache-bust worker URL with the installed library version so old workers are
  // never reused after a pdfjs-dist package update.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs?v=${pdfjsLib.version}`;

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
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

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
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
}

export async function extractDocumentFields(
  file: File
): Promise<ExtractedFields> {
  const buffer = await file.arrayBuffer();
  const lower = file.name.toLowerCase();
  let rawText = "";

  try {
    if (lower.endsWith(".pdf")) {
      rawText = await extractTextFromPdf(buffer);
    } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
      rawText = await extractTextFromDocx(buffer);
    }
  } catch (err) {
    console.warn("[doc-extract] extração de texto falhou:", err instanceof Error ? err.message : err);
  }

  const { objetivos, fundamentacao } = rawText
    ? parseFormativeContent(rawText)
    : { objetivos: "", fundamentacao: "" };

  return { objetivos, fundamentacao };
}
