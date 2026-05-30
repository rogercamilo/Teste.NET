import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, readLocalFile, localFileExists } from "@/lib/storage";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";
import { SessionUser } from "@/lib/auth-helpers";
import { type NextRequest } from "next/server";

function canRead(
  doc: { uploadedById: string | null; moradaId: string | null },
  user: SessionUser
): boolean {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  if (doc.uploadedById === user.id) return true;
  if (doc.moradaId && doc.moradaId === user.moradaId) return true;
  return false;
}

function canDelete(doc: { uploadedById: string | null }, user: SessionUser): boolean {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  return doc.uploadedById === user.id;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  const user = session.user as SessionUser;

  const doc = await prisma.arquivo.findFirst({
    where: { id, organizacaoId: user.organizacaoId },
  });

  if (!doc) return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  if (!canRead(doc, user)) return Response.json({ error: "Acesso negado" }, { status: 403 });

  // R2: redireciona para pre-signed URL
  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  ) {
    const { getFileUrl } = await import("@/lib/storage");
    const url = await getFileUrl(doc.storageKey, doc.id);
    const expectedPrefix = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    if (!url.startsWith(expectedPrefix)) {
      return Response.json({ error: "URL de redirecionamento inválida" }, { status: 500 });
    }
    return Response.redirect(url, 302);
  }

  // Local: serve do disco
  if (!await localFileExists(doc.storageKey)) {
    return Response.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 });
  }

  const fileBuffer = await readLocalFile(doc.storageKey);

  return new Response(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": doc.tipo,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.nome)}`,
      "Content-Length": String(doc.tamanho),
      "Cache-Control": "private, no-cache",
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const user = session.user as SessionUser;

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return Response.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });

  const doc = await prisma.arquivo.findFirst({
    where: { id, organizacaoId: user.organizacaoId },
  });

  if (!doc) return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  if (!canDelete(doc, user)) return Response.json({ error: "Acesso negado" }, { status: 403 });

  await deleteFile(doc.storageKey);
  await prisma.arquivo.delete({ where: { id } });

  logAction("document_deleted", user.id, getClientIp(_request), { documentoId: id }, user.organizacaoId);
  return Response.json({ ok: true });
}
