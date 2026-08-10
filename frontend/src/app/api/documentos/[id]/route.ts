import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, readLocalFile, localFileExists, readFileBuffer, R2_ENABLED } from "@/lib/storage";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";
import { SessionUser } from "@/lib/auth-helpers";
import { type NextRequest } from "next/server";

function canRead(
  doc: { uploadedById: string | null; grupoFormacaoId: string | null },
  user: SessionUser
): boolean {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  if (doc.uploadedById === user.id) return true;
  if (doc.grupoFormacaoId && doc.grupoFormacaoId === user.grupoFormacaoId) return true;
  return false;
}

function canDelete(doc: { uploadedById: string | null }, user: SessionUser): boolean {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  return doc.uploadedById === user.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  const user = session.user as SessionUser;

  // `?stream=1`: bytes same-origin (visualizador pdf.js). `?download=1`: força attachment.
  const wantsStream = request.nextUrl.searchParams.get("stream") === "1";
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";

  const doc = await prisma.arquivo.findFirst({
    where: { id, organizacaoId: user.organizacaoId },
  });

  if (!doc) return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  if (!canRead(doc, user)) return Response.json({ error: "Acesso negado" }, { status: 403 });

  // Serve os bytes same-origin (sem redirect ao R2) — necessário para o pdf.js.
  if (wantsStream) {
    if (!R2_ENABLED && !(await localFileExists(doc.storageKey))) {
      return Response.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 });
    }
    const buffer = await readFileBuffer(doc.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.tipo,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(doc.nome)}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  }

  // R2: redireciona para pre-signed URL
  if (R2_ENABLED) {
    const { getFileUrl } = await import("@/lib/storage");
    const url = await getFileUrl(doc.storageKey, doc.id, 900, wantsDownload ? doc.nome : undefined);
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
      "Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(doc.nome)}`,
      "Content-Length": String(fileBuffer.length),
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
