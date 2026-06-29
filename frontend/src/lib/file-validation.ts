/**
 * Validação de conteúdo de upload por "magic bytes" (assinatura real do arquivo).
 *
 * Impede spoofing de MIME type: o cliente controla o `Content-Type` declarado no
 * multipart, então confiar nele permite subir conteúdo arbitrário (HTML/JS, PDF,
 * payloads) rotulado como imagem. Aqui conferimos os primeiros bytes do buffer
 * contra a assinatura conhecida do tipo declarado.
 *
 * Usado por todos os endpoints de upload (imagens, arquivos, documentos,
 * livro-registro) para manter a validação consistente.
 */

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

/** Matchers de assinatura por MIME type. */
const SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  "image/png": (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/jpeg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  "image/jpg": (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  // RIFF....WEBP — "RIFF" no offset 0 e "WEBP" no offset 8
  "image/webp": (b) => startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8),
  "application/pdf": (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]), // %PDF
  // DOCX (e qualquer OOXML) é um ZIP — "PK"
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b) =>
    startsWith(b, [0x50, 0x4b, 0x03, 0x04]) || startsWith(b, [0x50, 0x4b, 0x05, 0x06]) || startsWith(b, [0x50, 0x4b, 0x07, 0x08]),
  // DOC legado — OLE2 Compound File
  "application/msword": (b) =>
    startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) ||
    startsWith(b, [0x50, 0x4b, 0x03, 0x04]), // alguns .doc modernos chegam como zip
};

/**
 * Retorna true se o conteúdo do buffer corresponde à assinatura do MIME declarado.
 * Tipos sem assinatura conhecida retornam false (fail-closed).
 */
export function matchesDeclaredType(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length === 0) return false; // arquivo vazio nunca é válido
  const matcher = SIGNATURES[mimeType];
  if (!matcher) return false;
  return matcher(buffer);
}

/**
 * Normaliza o nome de arquivo recebido do cliente para apenas o "basename",
 * descartando qualquer componente de diretório (`/` ou `\`). Defesa em
 * profundidade: o nome é só rótulo de exibição (o storageKey é gerado no
 * servidor), mas evita armazenar/exibir nomes como `../../../etc/passwd`.
 */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  return base.trim();
}
