import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { canUpload } from "@/lib/plan-limits";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { type NextRequest } from "next/server";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

type SessionUser = { id?: string; role?: string; name?: string | null; organizacaoId?: string };

export async function GET(request: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return Response.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const url = new URL(request.url);
    const entityType = url.searchParams.get("entityType") ?? undefined;
    const entityId = url.searchParams.get("entityId") ?? undefined;

    const where = {
      organizacaoId: user.organizacaoId,
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    };
    const pagination = parsePagination(url.searchParams);
    const orderBy = { criadoEm: "desc" as const };

    const toArquivo = (a: { id: string; nome: string; tamanho: number; tipo: string; extensao: string; entityType: string | null; entityId: string | null; criadoEm: Date }) => ({
      id: a.id,
      nome: a.nome,
      tamanho: a.tamanho,
      tipo: a.tipo,
      extensao: a.extensao,
      entityType: a.entityType,
      entityId: a.entityId,
      criadoEm: a.criadoEm.toISOString(),
    });

    if (!pagination) {
      const arquivos = await prisma.arquivo.findMany({ where, orderBy });
      return Response.json(arquivos.map(toArquivo));
    }

    const [arquivos, total] = await Promise.all([
      prisma.arquivo.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.arquivo.count({ where }),
    ]);

    return Response.json(
      arquivos.map(toArquivo),
      { headers: paginationHeaders(total, pagination) }
    );
  } catch (err) {
    logError("", err);
    return Response.json({ error: "Falha ao carregar arquivos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const user = session.user as SessionUser;

  const rl = await limiters.upload(user.id ?? "unknown");
  if (!rl.allowed) {
    return Response.json(
      { error: "Limite de uploads atingido. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    logError("", err);
    return Response.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const entityType = (formData.get("entityType") as string) || "";
  const entityId = (formData.get("entityId") as string) || "";

  if (!file || !entityType || !entityId) {
    return Response.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const extensao = ALLOWED_TYPES[file.type];
  if (!extensao) {
    return Response.json(
      { error: "Tipo de arquivo não permitido. Use PDF ou Word." },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Arquivo excede o limite de 10 MB." }, { status: 422 });
  }

  if (!user.organizacaoId) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const orgId = user.organizacaoId;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Valida assinatura real do arquivo (magic bytes) — impede spoofing de MIME type
  const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50; // %P
  const isOffice = buffer[0] === 0x50 && buffer[1] === 0x4b; // PK (ZIP — DOCX/DOC)
  const isDoc = buffer[0] === 0xd0 && buffer[1] === 0xcf; // OLE2 — DOC legado
  if (!isPdf && !isOffice && !isDoc) {
    return Response.json({ error: "Conteúdo do arquivo não corresponde ao tipo declarado." }, { status: 422 });
  }

  const uploadCheck = await canUpload(orgId, file.size);
  if (!uploadCheck.allowed) {
    return Response.json({ error: uploadCheck.reason }, { status: 403 });
  }

  let storageKey: string;
  try {
    storageKey = await uploadFile(orgId, "arquivos", buffer, extensao, file.type);
  } catch (err) {
    logError("", err);
    return Response.json({ error: "Falha ao salvar arquivo." }, { status: 500 });
  }

  const arquivo = await prisma.arquivo.create({
    data: {
      organizacaoId: orgId,
      nome: file.name,
      tamanho: file.size,
      tipo: file.type,
      extensao,
      storageKey,
      uploadedById: user.id,
      uploadedByNome: user.name ?? null,
      entityType,
      entityId,
    },
  });

  logAction("file_uploaded", user.id, getClientIp(request), {
    arquivoId: arquivo.id,
    entityType,
    entityId,
    tamanho: file.size,
  }, orgId);

  return Response.json(
    { id: arquivo.id, nome: arquivo.nome, tamanho: arquivo.tamanho, tipo: arquivo.tipo, criadoEm: arquivo.criadoEm.toISOString() },
    { status: 201 }
  );
}
