import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, readLocalFile, localFileExists } from "@/lib/storage";
import { logAction, getClientIp } from "@/lib/audit-log";
import { type NextRequest } from "next/server";

type SessionUser = { id?: string; role?: string; organizacaoId?: string };

// Leitura: isolamento de tenant é garantido pelo WHERE clause — qualquer membro da org pode ler
function canRead(): boolean {
  return true;
}

function canDelete(arquivo: { uploadedById: string | null }, user: SessionUser): boolean {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  return arquivo.uploadedById === user.id;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return new Response("Não autenticado", { status: 401 });

  const { id } = await params;
  const arquivo = await prisma.arquivo.findFirst({
    where: { id, organizacaoId: user.organizacaoId },
  });

  if (!arquivo) return new Response("Arquivo não encontrado", { status: 404 });
  if (!canRead()) return new Response("Sem permissão", { status: 403 });

  // R2: redireciona para pre-signed URL gerada em tempo real
  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  ) {
    const { getFileUrl } = await import("@/lib/storage");
    const url = await getFileUrl(arquivo.storageKey, arquivo.id);
    const expectedPrefix = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
    if (!url.startsWith(expectedPrefix)) {
      return new Response("URL de redirecionamento inválida", { status: 500 });
    }
    return Response.redirect(url, 302);
  }

  // Local: serve o arquivo diretamente do disco
  if (!localFileExists(arquivo.storageKey)) {
    return new Response("Arquivo não encontrado no servidor", { status: 404 });
  }

  const buffer = readLocalFile(arquivo.storageKey);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": arquivo.tipo,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-cache",
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const arquivo = await prisma.arquivo.findFirst({
    where: { id, organizacaoId: user.organizacaoId },
  });

  if (!arquivo) return Response.json({ error: "Arquivo não encontrado" }, { status: 404 });
  if (!canDelete(arquivo, user)) return Response.json({ error: "Sem permissão" }, { status: 403 });

  await deleteFile(arquivo.storageKey);
  await prisma.arquivo.delete({ where: { id } });

  logAction("file_deleted", user.id, getClientIp(request), { arquivoId: id }, user.organizacaoId);
  return Response.json({ ok: true });
}
