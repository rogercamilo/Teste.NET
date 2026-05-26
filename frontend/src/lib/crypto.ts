/**
 * AES-256-GCM field-level encryption for sensitive values stored in the database.
 *
 * Requires APP_ENCRYPTION_KEY (64 hex chars = 32 bytes) in environment.
 * Without the key, encrypt() returns plaintext and decrypt() returns the raw stored value.
 * Encrypted values are prefixed with "enc:v1:" so legacy plaintext is handled transparently.
 *
 * Key rotation: generate a new key, re-encrypt existing records with encryptField(decryptField(old)).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, "hex");
  if (buf.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }
  return buf;
}

export function encryptField(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(12); // 96-bit IV is standard for GCM
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return PREFIX + iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

export function decryptField(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // plaintext or no key was set when saved

  const key = getKey();
  if (!key) return stored; // stored encrypted but key not available — return raw

  const payload = stored.slice(PREFIX.length);
  const colonA = payload.indexOf(":");
  const colonB = payload.indexOf(":", colonA + 1);
  if (colonA === -1 || colonB === -1) return stored;

  const iv = Buffer.from(payload.slice(0, colonA), "hex");
  const authTag = Buffer.from(payload.slice(colonA + 1, colonB), "hex");
  const encrypted = Buffer.from(payload.slice(colonB + 1), "hex");

  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
