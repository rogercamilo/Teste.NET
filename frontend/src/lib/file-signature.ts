/**
 * Validação de assinatura real de arquivo (magic bytes) — função PURA.
 *
 * O `File.type` enviado pelo browser é o MIME *declarado* e é spoofável. Antes de
 * persistir e re-servir o arquivo (cartas de discernimento/etapa), conferimos os
 * primeiros bytes contra a assinatura conhecida do formato declarado. Cobre o
 * conjunto aceito pelas rotas de upload: PDF, imagens (JPEG/PNG/WebP/HEIC) e
 * documentos do Office (DOCX/DOC).
 */

// Marcas ISOBMFF (`ftyp`) que caracterizam um arquivo HEIC/HEIF.
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

// Assinatura de container ZIP (DOCX e demais OOXML): "PK" + 03 04 / 05 06 / 07 08.
function isZip(b: Buffer | Uint8Array): boolean {
  return b[0] === 0x50 && b[1] === 0x4b && (
    (b[2] === 0x03 && b[3] === 0x04) ||
    (b[2] === 0x05 && b[3] === 0x06) ||
    (b[2] === 0x07 && b[3] === 0x08)
  );
}

/**
 * Retorna true se os bytes iniciais de `buf` correspondem à assinatura do `mime`
 * declarado. MIME desconhecido → false (rejeita por segurança).
 */
export function assinaturaConfere(buf: Buffer | Uint8Array, mime: string): boolean {
  const b = buf;
  if (b.length < 12) return false;

  switch (mime) {
    case "application/pdf":
      // "%PDF"
      return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
    case "image/jpeg":
    case "image/jpg": // alias não-padrão aceito por algumas listas de MIME
      return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png":
      // \x89 P N G \r \n \x1a \n
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
    case "image/webp":
      // "RIFF" .... "WEBP"
      return (
        b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
      );
    case "image/heic": {
      // ISOBMFF: bytes 4-7 = "ftyp"; marca (brand) em 8-11.
      const ftyp = b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70;
      if (!ftyp) return false;
      const brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
      return HEIC_BRANDS.has(brand);
    }
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      // DOCX é um container ZIP.
      return isZip(b);
    case "application/msword":
      // DOC legado = OLE2 Compound File (D0 CF 11 E0 A1 B1 1A E1); aceita ZIP como
      // tolerância para .doc modernos exportados em formato OOXML.
      return (
        (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0 &&
          b[4] === 0xa1 && b[5] === 0xb1 && b[6] === 0x1a && b[7] === 0xe1) ||
        isZip(b)
      );
    default:
      return false;
  }
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
