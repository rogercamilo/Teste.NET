/**
 * Abstração de armazenamento de arquivos.
 * Modo local (dev): salva em data/uploads/<storageKey>
 * Modo R2 (prod): salva no bucket Cloudflare R2 quando as env vars estiverem configuradas.
 *
 * Env vars para R2:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 */

import { randomBytes } from "crypto";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import type { S3Client } from "@aws-sdk/client-s3";

const LOCAL_ROOT = join(process.cwd(), "data", "uploads");

function isR2Enabled(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

function generateKey(orgId: string, subpath: string, ext: string): string {
  const uuid = randomBytes(16).toString("hex");
  return `org_${orgId}/${subpath}/${uuid}${ext}`;
}

// ---------------------------------------------------------------------------
// Local storage (desenvolvimento)
// ---------------------------------------------------------------------------

function ensureLocalDir(storageKey: string): void {
  const dir = join(LOCAL_ROOT, storageKey.split("/").slice(0, -1).join("/"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function uploadLocal(
  orgId: string,
  subpath: string,
  buffer: Buffer,
  ext: string
): Promise<string> {
  const key = generateKey(orgId, subpath, ext);
  ensureLocalDir(key);
  writeFileSync(join(LOCAL_ROOT, key), buffer);
  return key;
}

async function deleteLocal(storageKey: string): Promise<void> {
  const fullPath = join(LOCAL_ROOT, storageKey);
  if (existsSync(fullPath)) unlinkSync(fullPath);
}

export function readLocalFile(storageKey: string): Buffer {
  return readFileSync(join(LOCAL_ROOT, storageKey));
}

export function localFileExists(storageKey: string): boolean {
  return existsSync(join(LOCAL_ROOT, storageKey));
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
  if (isR2Enabled()) return uploadR2(orgId, subpath, buffer, ext, mimeType);
  return uploadLocal(orgId, subpath, buffer, ext);
}

/**
 * Exclui um arquivo do storage.
 */
export async function deleteFile(storageKey: string): Promise<void> {
  if (isR2Enabled()) return deleteR2(storageKey);
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
  if (isR2Enabled()) return getPresignedUrlR2(storageKey, ttl);
  return `/api/arquivos/${arquivoId}`;
}
