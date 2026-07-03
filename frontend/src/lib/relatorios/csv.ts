/**
 * Geração de CSV para relatórios exportáveis (item 3.2). Separador `;` + BOM
 * UTF-8 para abrir corretamente no Excel em pt-BR (que assume `;` como
 * delimitador e precisa do BOM para acentuação). Linhas terminam em CRLF.
 */

const SEP = ";";
const BOM = "﻿";

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s.includes(SEP) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const linhas = [headers, ...rows].map((r) => r.map(escapeCell).join(SEP));
  return BOM + linhas.join("\r\n");
}
