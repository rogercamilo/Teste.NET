import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { getUserName } from "@/lib/current-user";
import { limiters } from "@/lib/rate-limit";
import { canUpload, notifyAvancadoLimitIfNeeded } from "@/lib/plan-limits";
import { assinaturaConfere, sanitizeFilename } from "@/lib/file-signature";
import { scanUpload } from "@/lib/av-scan";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { SessionUser } from "@/lib/auth-helpers";
import { type NextRequest } from "next/server";

async function checkEntityInOrg(entityType: string, entityId: string, orgId: string): Promise<boolean> {
  const q = { where: { id: entityId, organizacaoId: orgId }, select: { id: true } };
  switch (entityType) {
    case "formando": return !!(await prisma.formando.findFirst(q));
    case "formacao": return !!(await prisma.formacao.findFirst(q));
    case "morada": return !!(await prisma.grupoFormacao.findFirst(q));
    case "grade": return !!(await prisma.gradeFormativa.findFirst(q));
    case "plano": return !!(await prisma.planoFormativo.findFirst(q));
    default: return false;
  }
}

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB


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
    logError("arquivos", err);
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
    logError("arquivos", err);
    return Response.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const entityType = (formData.get("entityType") as string) || "";
  const entityId = (formData.get("entityId") as string) || "";

  if (!file || !entityType || !entityId) {
    return Response.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const nome = sanitizeFilename(file.name);
  if (!nome || nome.length > 255) {
    return Response.json({ error: "Nome de arquivo inválido." }, { status: 422 });
  }

  const VALID_ENTITY_TYPES = new Set(["formando", "formacao", "morada", "grade", "plano"]);
  if (!VALID_ENTITY_TYPES.has(entityType)) {
    return Response.json({ error: "Tipo de entidade inválido." }, { status: 422 });
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

  if (!(await checkEntityInOrg(entityType, entityId, orgId))) {
    return Response.json({ error: "Entidade não encontrada" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Valida assinatura real do arquivo (magic bytes) — impede spoofing de MIME type
  if (!assinaturaConfere(buffer, file.type)) {
    return Response.json({ error: "Conteúdo do arquivo não corresponde ao tipo declarado." }, { status: 422 });
  }

  // Filtro heurístico de malware (macros/PDF ativo/EICAR) antes de persistir.
  const scan = await scanUpload(buffer, file.type);
  if (!scan.clean) {
    logAction("upload_rejected_malware", user.id, getClientIp(request), { nome, motivo: scan.reason }, orgId);
    return Response.json({ error: "Arquivo rejeitado por suspeita de conteúdo malicioso." }, { status: 422 });
  }

  const uploadCheck = await canUpload(orgId, file.size);
  if (!uploadCheck.allowed) {
    notifyAvancadoLimitIfNeeded(orgId, "storage");
    return Response.json({ error: uploadCheck.reason }, { status: 403 });
  }

  let storageKey: string;
  try {
    storageKey = await uploadFile(orgId, "arquivos", buffer, extensao, file.type);
  } catch (err) {
    logError("arquivos", err);
    return Response.json({ error: "Falha ao salvar arquivo." }, { status: 500 });
  }

  const arquivo = await prisma.arquivo.create({
    data: {
      organizacaoId: orgId,
      nome,
      tamanho: file.size,
      tipo: file.type,
      extensao,
      storageKey,
      uploadedById: user.id,
      uploadedByNome: (await getUserName(user.id)) ?? user.name ?? null,
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
