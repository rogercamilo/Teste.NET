/**
 * Server-side store for files attached to entities (planos, grades, formações).
 * Metadata: data/arquivos-meta.json
 * Files:    data/arquivos/<id><ext>
 * NEVER import this module in client components — it uses Node.js 'fs'.
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join } from "path";

export interface ArquivoMeta {
  id: string;
  entityType: string; // "plano" | "grade" | "formacao"
  entityId: string;
  nome: string;
  tamanho: number;
  tipo: string;
  extensao: string;
  uploadadoPor: string;
  criadoEm: string;
}

const DATA_DIR = join(process.cwd(), "data");
const META_FILE = join(DATA_DIR, "arquivos-meta.json");
const FILES_DIR = join(DATA_DIR, "arquivos");

function ensureDirs() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILES_DIR)) mkdirSync(FILES_DIR, { recursive: true });
}

function readMeta(): ArquivoMeta[] {
  ensureDirs();
  if (!existsSync(META_FILE)) {
    writeFileSync(META_FILE, "[]", "utf-8");
    return [];
  }
  return JSON.parse(readFileSync(META_FILE, "utf-8")) as ArquivoMeta[];
}

function writeMeta(metas: ArquivoMeta[]): void {
  ensureDirs();
  writeFileSync(META_FILE, JSON.stringify(metas, null, 2), "utf-8");
}

export function listArquivos(filters?: {
  entityType?: string;
  entityId?: string;
}): ArquivoMeta[] {
  let all = readMeta();
  if (!filters) return all;
  if (filters.entityType) all = all.filter((a) => a.entityType === filters.entityType);
  if (filters.entityId) all = all.filter((a) => a.entityId === filters.entityId);
  return all;
}

export function findArquivo(id: string): ArquivoMeta | undefined {
  return readMeta().find((a) => a.id === id);
}

export function saveArquivo(
  meta: Omit<ArquivoMeta, "id" | "criadoEm">,
  fileBuffer: Buffer
): ArquivoMeta {
  ensureDirs();
  const id = `arq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const criadoEm = new Date().toISOString();
  const full: ArquivoMeta = { id, ...meta, criadoEm };

  writeFileSync(join(FILES_DIR, `${id}${meta.extensao}`), fileBuffer);

  const all = readMeta();
  all.push(full);
  writeMeta(all);

  return full;
}

export function deleteArquivo(id: string): boolean {
  const all = readMeta();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return false;

  const meta = all[idx];
  const filePath = join(FILES_DIR, `${meta.id}${meta.extensao}`);
  if (existsSync(filePath)) unlinkSync(filePath);

  all.splice(idx, 1);
  writeMeta(all);
  return true;
}

export function getArquivoFilePath(meta: ArquivoMeta): string {
  return join(FILES_DIR, `${meta.id}${meta.extensao}`);
}
