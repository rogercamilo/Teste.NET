/**
 * Server-side document store.
 * Metadata: data/documentos-meta.json
 * Files:    data/documentos/<id><ext>
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

export interface DocumentoMeta {
  id: string;
  eventoId: string;
  formandoId: string;
  formandoNome: string;
  tipoEvento: string;
  uploadadoPor: string;
  uploadadoPorNome: string;
  grupoFormacaoId?: string;
  nome: string;
  tamanho: number;
  tipo: string;
  extensao: string; // ".pdf" | ".docx"
  criadoEm: string;
}

const DATA_DIR = join(process.cwd(), "data");
const META_FILE = join(DATA_DIR, "documentos-meta.json");
const FILES_DIR = join(DATA_DIR, "documentos");

function ensureDirs() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILES_DIR)) mkdirSync(FILES_DIR, { recursive: true });
}

function readMeta(): DocumentoMeta[] {
  ensureDirs();
  if (!existsSync(META_FILE)) {
    writeFileSync(META_FILE, "[]", "utf-8");
    return [];
  }
  return JSON.parse(readFileSync(META_FILE, "utf-8")) as DocumentoMeta[];
}

function writeMeta(metas: DocumentoMeta[]): void {
  ensureDirs();
  writeFileSync(META_FILE, JSON.stringify(metas, null, 2), "utf-8");
}

export function listDocumentos(filters?: {
  eventoId?: string;
  formandoId?: string;
  grupoFormacaoId?: string;
  uploadadoPor?: string;
}): DocumentoMeta[] {
  let all = readMeta();
  if (!filters) return all;
  if (filters.eventoId) all = all.filter((d) => d.eventoId === filters.eventoId);
  if (filters.formandoId) all = all.filter((d) => d.formandoId === filters.formandoId);
  if (filters.grupoFormacaoId) all = all.filter((d) => d.grupoFormacaoId === filters.grupoFormacaoId);
  if (filters.uploadadoPor) all = all.filter((d) => d.uploadadoPor === filters.uploadadoPor);
  return all;
}

export function findDocumento(id: string): DocumentoMeta | undefined {
  return readMeta().find((d) => d.id === id);
}

export function saveDocumento(
  meta: Omit<DocumentoMeta, "id" | "criadoEm">,
  fileBuffer: Buffer
): DocumentoMeta {
  ensureDirs();
  const id = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const criadoEm = new Date().toISOString();
  const full: DocumentoMeta = { id, ...meta, criadoEm };

  writeFileSync(join(FILES_DIR, `${id}${meta.extensao}`), fileBuffer);

  const all = readMeta();
  all.push(full);
  writeMeta(all);

  return full;
}

export function deleteDocumento(id: string): boolean {
  const all = readMeta();
  const idx = all.findIndex((d) => d.id === id);
  if (idx === -1) return false;

  const meta = all[idx];
  const filePath = join(FILES_DIR, `${meta.id}${meta.extensao}`);
  if (existsSync(filePath)) unlinkSync(filePath);

  all.splice(idx, 1);
  writeMeta(all);
  return true;
}

export function getDocumentoFilePath(meta: DocumentoMeta): string {
  return join(FILES_DIR, `${meta.id}${meta.extensao}`);
}
