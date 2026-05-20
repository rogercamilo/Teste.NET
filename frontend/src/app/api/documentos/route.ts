import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/storage";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { type NextRequest } from "next/server";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

type SessionUser = {
  id?: string;
  role?: string;
  moradaId?: string | null;
  name?: string | null;
  organizacaoId?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const user = session.user as SessionUser;

  const rl = limiters.upload(user.id ?? "unknown");
  if (!rl.allowed) {
    return Response.json(
      { error: "Limite de uploads atingido. Tente novamente mais tarde." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Requisição inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const eventoId = formData.get("eventoId") as string;
  const formandoId = formData.get("formandoId") as string;
  const formandoNome = (formData.get("formandoNome") as string) || "";
  const tipoEvento = (formData.get("tipoEvento") as string) || "";
  const moradaId = (formData.get("moradaId") as string) || user.moradaId || undefined;

  if (!file || !eventoId || !formandoId) {
    return Response.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
  }

  const extensao = ALLOWED_TYPES[file.type];
  if (!extensao) {
    return Response.json(
      { error: "Tipo de arquivo não permitido. Use PDF ou DOCX." },
      { status: 422 }
    );
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: "Arquivo excede o limite de 5 MB." }, { status: 422 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const orgId = user.organizacaoId ?? "default";

  let storageKey: string;
  try {
    storageKey = await uploadFile(orgId, "documentos", buffer, extensao, file.type);
  } catch {
    return Response.json({ error: "Falha ao salvar documento." }, { status: 500 });
  }

  const documento = await prisma.arquivo.create({
    data: {
      organizacaoId: orgId,
      nome: file.name,
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
      moradaId: moradaId ?? null,
    },
  });

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
  const url = new URL(request.url);
  const eventoId = url.searchParams.get("eventoId") ?? undefined;
  const formandoId = url.searchParams.get("formandoId") ?? undefined;

  const where = {
    organizacaoId: user.organizacaoId,
    // Documentos de evento têm eventoId preenchido
    NOT: { eventoId: null },
    ...(eventoId ? { eventoId } : {}),
    ...(formandoId ? { formandoId } : {}),
  };

  const isAdmin = user.role === "administrador" || user.role === "formador_geral";

  const documentos = await prisma.arquivo.findMany({
    where: isAdmin
      ? where
      : {
          ...where,
          OR: [
            { uploadedById: user.id },
            { moradaId: user.moradaId ?? undefined },
          ],
        },
    orderBy: { criadoEm: "desc" },
  });

  return Response.json(
    documentos.map((d) => ({
      id: d.id,
      nome: d.nome,
      tamanho: d.tamanho,
      tipo: d.tipo,
      eventoId: d.eventoId,
      formandoId: d.formandoId,
      formandoNome: d.formandoNome,
      tipoEvento: d.tipoEvento,
      uploadadoPor: d.uploadedById,
      uploadadoPorNome: d.uploadedByNome,
      moradaId: d.moradaId,
      criadoEm: d.criadoEm.toISOString(),
    }))
  );
}
