import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile, deleteFile } from "@/lib/storage";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { matchesDeclaredType, sanitizeFilename } from "@/lib/file-validation";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { SessionUser } from "@/lib/auth-helpers";
import { type NextRequest } from "next/server";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB


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
    logError("documentos", err);
    return Response.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const eventoId = formData.get("eventoId") as string;
  const formandoId = formData.get("formandoId") as string;
  const formandoNome = (formData.get("formandoNome") as string) || "";
  const tipoEvento = (formData.get("tipoEvento") as string) || "";
  const grupoFormacaoId = (formData.get("grupoFormacaoId") as string) || user.grupoFormacaoId || undefined;

  if (!file || !eventoId || !formandoId) {
    return Response.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  if (!user.organizacaoId) return Response.json({ error: "Sessão inválida" }, { status: 401 });

  const nome = sanitizeFilename(file.name);
  if (!nome || nome.length > 255) {
    return Response.json({ error: "Nome de arquivo inválido." }, { status: 422 });
  }

  const extensao = ALLOWED_TYPES[file.type];
  if (!extensao) {
    return Response.json(
      { error: "Tipo de arquivo não permitido. Use PDF ou DOCX." },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Arquivo excede o limite de 10 MB." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Valida assinatura real do arquivo (magic bytes) — impede spoofing de MIME type
  if (!matchesDeclaredType(buffer, file.type)) {
    return Response.json({ error: "Conteúdo do arquivo não corresponde ao tipo declarado." }, { status: 422 });
  }

  const orgId = user.organizacaoId;

  // Valida que formando e evento pertencem a esta org (isolamento de tenant).
  // `eventoId` é o id de um EventoFormando — a mesma tabela referenciada pela FK
  // `Arquivo.eventoId`. Validar contra `agendamento` (tabela errada) rejeitava
  // todo upload legítimo (404) ou violava a FK no insert (500).
  const [formando, evento] = await Promise.all([
    prisma.formando.findFirst({ where: { id: formandoId, organizacaoId: orgId, deletedAt: null } }),
    prisma.eventoFormando.findFirst({ where: { id: eventoId, organizacaoId: orgId } }),
  ]);
  if (!formando) return Response.json({ error: "Formando não encontrado" }, { status: 404 });
  if (!evento) return Response.json({ error: "Evento não encontrado" }, { status: 404 });

  let storageKey: string;
  try {
    storageKey = await uploadFile(orgId, "documentos", buffer, extensao, file.type);
  } catch (err) {
    logError("documentos", err);
    return Response.json({ error: "Falha ao salvar documento." }, { status: 500 });
  }

  let documento: Awaited<ReturnType<typeof prisma.arquivo.create>>;
  try {
    documento = await prisma.arquivo.create({
      data: {
        organizacaoId: orgId,
        nome,
        tamanho: file.size,
        tipo: file.type,
        extensao,
        storageKey,
        uploadedById: user.id,
        uploadedByNome: user.name ?? null,
        eventoId,
        formandoId,
        formandoNome,
        tipoEvento,
        grupoFormacaoId: grupoFormacaoId ?? null,
      },
    });
  } catch (err) {
    logError("documentos POST db", err);
    // Arquivo foi salvo no storage mas o registro de banco falhou — remove para evitar órfão
    deleteFile(storageKey).catch(() => {});
    return Response.json({ error: "Falha ao registrar documento." }, { status: 500 });
  }

  logAction("document_uploaded", user.id, getClientIp(request), {
    documentoId: documento.id,
    eventoId,
    formandoId,
    tamanho: file.size,
  }, orgId);

  return Response.json(
    { id: documento.id, nome: documento.nome, tamanho: documento.tamanho, tipo: documento.tipo, criadoEm: documento.criadoEm.toISOString() },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const user = session.user as SessionUser;

  try {
    const url = new URL(request.url);
    const eventoId = url.searchParams.get("eventoId") ?? undefined;
    const formandoId = url.searchParams.get("formandoId") ?? undefined;

    const where = {
      organizacaoId: user.organizacaoId,
      NOT: { eventoId: null },
      ...(eventoId ? { eventoId } : {}),
      ...(formandoId ? { formandoId } : {}),
    };

    const isAdminRole = user.role === "administrador" || user.role === "formador_geral";
    const effectiveWhere = isAdminRole
      ? where
      : { ...where, OR: [{ uploadedById: user.id }, { grupoFormacaoId: user.grupoFormacaoId ?? undefined }] };
    const pagination = parsePagination(url.searchParams);
    const orderBy = { criadoEm: "desc" as const };

    const toDoc = (d: {
      id: string; nome: string; tamanho: number; tipo: string; extensao: string;
      eventoId: string | null; formandoId: string | null; formandoNome: string | null;
      tipoEvento: string | null; uploadedById: string | null; uploadedByNome: string | null;
      grupoFormacaoId: string | null; criadoEm: Date;
    }) => ({
      id: d.id, nome: d.nome, tamanho: d.tamanho, tipo: d.tipo, extensao: d.extensao,
      eventoId: d.eventoId, formandoId: d.formandoId, formandoNome: d.formandoNome,
      tipoEvento: d.tipoEvento, uploadadoPor: d.uploadedById,
      uploadadoPorNome: d.uploadedByNome, grupoFormacaoId: d.grupoFormacaoId,
      criadoEm: d.criadoEm.toISOString(),
    });

    if (!pagination) {
      const documentos = await prisma.arquivo.findMany({ where: effectiveWhere, orderBy });
      return Response.json(documentos.map(toDoc));
    }

    const [documentos, total] = await Promise.all([
      prisma.arquivo.findMany({ where: effectiveWhere, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.arquivo.count({ where: effectiveWhere }),
    ]);
    return Response.json(documentos.map(toDoc), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("documentos", err);
    return Response.json({ error: "Falha ao carregar documentos" }, { status: 500 });
  }
}
