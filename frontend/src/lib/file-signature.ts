/**
 * Validação de assinatura real de arquivo (magic bytes) — função PURA.
 *
 * O `File.type` enviado pelo browser é o MIME *declarado* e é spoofável. Antes de
 * persistir e re-servir o arquivo (cartas de discernimento/etapa), conferimos os
 * primeiros bytes contra a assinatura conhecida do formato declarado. Cobre o
 * conjunto aceito pelas rotas de carta: PDF + imagens (JPEG/PNG/WebP/HEIC).
 */

// Marcas ISOBMFF (`ftyp`) que caracterizam um arquivo HEIC/HEIF.
const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"]);

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
    default:
      return false;
  }
}
