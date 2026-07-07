import "server-only";
import { uploadFile } from "@/lib/storage";
import { assinaturaConfere } from "@/lib/file-signature";
import { scanUpload } from "@/lib/av-scan";

/**
 * Pipeline ÚNICO de validação + persistência de foto (avatar) — fonte de verdade
 * compartilhada por `/api/imagens` (app) e `/api/portal/imagens` (portal). Código
 * de segurança (magic bytes + varredura de malware) NÃO deve ser copiado entre
 * rotas: uma cópia divergir é uma brecha. As rotas só cuidam de auth + auditoria;
 * a decisão de aceitar o arquivo mora aqui.
 *
 * `malwareReason` (no caso de rejeição) volta para a rota logar o evento com o
 * ator correto (usuário do app vs. formando do portal).
 */
export type ImageUploadResult =
  | { ok: true; key: string }
  | { ok: false; status: number; error: string; malwareReason?: string };

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const EXT_MAP: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function processImageUpload(
  file: unknown,
  organizacaoId: string
): Promise<ImageUploadResult> {
  if (!(file instanceof File)) {
    return { ok: false, status: 400, error: "Campo 'file' ausente ou inválido." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, status: 400, error: "Tipo de arquivo não suportado. Use JPEG, PNG ou WebP." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false, status: 400, error: "Imagem muito grande. Máximo 5 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Assinatura real do arquivo (magic bytes) — impede spoofing de MIME type: o
  // `file.type` é controlado pelo cliente e sozinho não garante nada.
  if (!assinaturaConfere(buffer, file.type)) {
    return { ok: false, status: 400, error: "Conteúdo do arquivo não corresponde a uma imagem válida." };
  }

  // Filtro heurístico de malware (EICAR) antes de persistir.
  const scan = await scanUpload(buffer, file.type);
  if (!scan.clean) {
    return { ok: false, status: 400, error: "Arquivo rejeitado por suspeita de conteúdo malicioso.", malwareReason: scan.reason };
  }

  const ext = EXT_MAP[file.type] ?? ".jpg";
  const key = await uploadFile(organizacaoId, "imagens", buffer, ext, file.type);
  return { ok: true, key };
}
