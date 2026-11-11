import "server-only";
import { readFileBuffer } from "@/lib/storage";

/**
 * Resolve a foto do formando (storage key, ou data-URL já embutido) para um
 * data-URL PNG/JPEG pronto para o `<Image>` do react-pdf — que só decodifica
 * PNG e JPEG. WEBP (formato aceito no upload) é convertido via `sharp` quando
 * disponível; qualquer falha cai em `null` (o PDF usa as iniciais). Nunca lança:
 * uma foto não pode quebrar a geração do documento.
 */

const EXT_MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
const DATA_URL_ACEITO = /^data:image\/(png|jpe?g);base64,/i;

async function webpParaPngDataUrl(buf: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const png = await sharp(buf).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function fotoParaDataUrl(fotoKey: string | null | undefined): Promise<string | null> {
  if (!fotoKey) return null;
  if (fotoKey.startsWith("data:")) {
    return DATA_URL_ACEITO.test(fotoKey) ? fotoKey : null;
  }
  const ext = fotoKey.split(".").pop()?.toLowerCase() ?? "jpg";
  try {
    const buf = await readFileBuffer(fotoKey);
    if (ext === "webp") return webpParaPngDataUrl(buf);
    const mime = EXT_MIME[ext];
    if (!mime) return null;
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
