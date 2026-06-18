/**
 * Abstração de armazenamento de arquivos.
 * Modo local (dev): salva em data/uploads/<storageKey>
 * Modo R2 (prod): salva no bucket Cloudflare R2 quando as env vars estiverem configuradas.
 *
 * Env vars para R2:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

import { randomBytes } from "crypto";
import { join, resolve, sep } from "path";
import { readFile, writeFile, mkdir, unlink, access } from "fs/promises";
import type { S3Client } from "@aws-sdk/client-s3";

const LOCAL_ROOT = join(process.cwd(), "data", "uploads");

export const R2_ENABLED = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

function generateKey(orgId: string, subpath: string, ext: string): string {
  const uuid = randomBytes(16).toString("hex");
  return `org_${orgId}/${subpath}/${uuid}${ext}`;
}

// ---------------------------------------------------------------------------
// Local storage (desenvolvimento)
// ---------------------------------------------------------------------------

async function ensureLocalDir(storageKey: string): Promise<void> {
  const dir = join(LOCAL_ROOT, storageKey.split("/").slice(0, -1).join("/"));
  await mkdir(dir, { recursive: true });
}

async function uploadLocal(
  orgId: string,
  subpath: string,
  buffer: Buffer,
  ext: string
): Promise<string> {
  const key = generateKey(orgId, subpath, ext);
  await ensureLocalDir(key);
  await writeFile(join(LOCAL_ROOT, key), buffer);
  return key;
}

async function deleteLocal(storageKey: string): Promise<void> {
  const fullPath = safeLocalPath(storageKey);
  try {
    await unlink(fullPath);
  } catch {
    // file already gone — nothing to do
  }
}

function safeLocalPath(storageKey: string): string {
  const fullPath = resolve(join(LOCAL_ROOT, storageKey));
  if (!fullPath.startsWith(LOCAL_ROOT + sep)) throw new Error("Path traversal detected");
  return fullPath;
}

export async function readLocalFile(storageKey: string): Promise<Buffer> {
  return readFile(safeLocalPath(storageKey));
}

export async function localFileExists(storageKey: string): Promise<boolean> {
  try {
    await access(safeLocalPath(storageKey));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// R2 storage (produção — Cloudflare R2 via S3-compatible API)
// ---------------------------------------------------------------------------

let _r2Client: S3Client | null = null;

async function getR2Client(): Promise<S3Client> {
  if (_r2Client) return _r2Client;
  const { S3Client } = await import("@aws-sdk/client-s3");
  _r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    // R2 requires path-style URLs; without this the SDK generates virtual-hosted URLs
    // (https://<bucket>.<account-id>.r2.cloudflarestorage.com) which break pre-signed URL validation
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return _r2Client;
}

async function uploadR2(
  orgId: string,
  subpath: string,
  buffer: Buffer,
  ext: string,
  mimeType: string
): Promise<string> {
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();
  const key = generateKey(orgId, subpath, ext);
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
  return key;
}

async function getPresignedUrlR2(storageKey: string, ttl: number): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const client = await getR2Client();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: storageKey }),
    { expiresIn: ttl }
  );
}

async function deleteR2(storageKey: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const client = await getR2Client();
  await client.send(
    new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: storageKey })
  );
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Faz upload de um arquivo e retorna a storageKey.
 * @param orgId        ID da organização (usado no path)
 * @param subpath      Subdiretório: "documentos" | "arquivos"
 * @param buffer       Conteúdo do arquivo
 * @param ext          Extensão com ponto: ".pdf" | ".docx"
 * @param mimeType     MIME type para o header Content-Type no R2
 */
export async function uploadFile(
  orgId: string,
  subpath: string,
  buffer: Buffer,
  ext: string,
  mimeType: string
): Promise<string> {
  if (R2_ENABLED) return uploadR2(orgId, subpath, buffer, ext, mimeType);
  return uploadLocal(orgId, subpath, buffer, ext);
}

/**
 * Exclui um arquivo do storage.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  if (R2_ENABLED) return deleteR2(storageKey);
  return deleteLocal(storageKey);
}

/**
 * Retorna a URL de acesso ao arquivo.
 * - R2: pre-signed URL com TTL em segundos (padrão 900 = 15 min)
 * - Local: path da API interna `/api/arquivos/<id>`
 */
export async function getFileUrl(
  storageKey: string,
  arquivoId: string,
  ttl = 900
): Promise<string> {
  if (R2_ENABLED) return getPresignedUrlR2(storageKey, ttl);
  return `/api/arquivos/${arquivoId}`;
}

/**
 * Retorna a pre-signed URL para uma imagem no R2 (TTL em segundos, padrão 3600 = 1h).
 * Retorna null em modo local — use readLocalFile + Response direto no serve handler.
 */
export async function getImageR2Url(storageKey: string, ttl = 3600): Promise<string | null> {
  if (!R2_ENABLED) return null;
  return getPresignedUrlR2(storageKey, ttl);
}

/**
 * Converte um valor do campo `foto` / `imagemUrl` do BD no `src` correto para <img>.
 * - base64 legacy (começa com "data:"): retorna direto
 * - key R2/local: retorna /api/imagens/serve?key=<key>
 * - null/undefined: retorna undefined
 */
export function resolveImageSrc(keyOrBase64: string | undefined | null): string | undefined {
  if (!keyOrBase64) return undefined;
  if (keyOrBase64.startsWith("data:")) return keyOrBase64;
  return `/api/imagens/serve?key=${encodeURIComponent(keyOrBase64)}`;
}
