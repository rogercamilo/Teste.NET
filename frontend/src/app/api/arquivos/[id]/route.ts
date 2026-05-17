import { auth } from "@/auth";
import { findArquivo, deleteArquivo, getArquivoFilePath } from "@/lib/arquivos-store";
import { logAction, getClientIp } from "@/lib/audit-log";
import { readFileSync, existsSync } from "fs";
import { type NextRequest } from "next/server";

type SessionUser = { id?: string; role?: string };

function canAccessArquivo(
  uploadadoPor: string,
  userId: string,
  role: string
): boolean {
  if (role === "administrador" || role === "formador_geral") return true;
  return uploadadoPor === userId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  if (!user?.id) {
    return new Response("Não autenticado", { status: 401 });
  }

  const { id } = await params;
  const meta = findArquivo(id);
  if (!meta) return new Response("Arquivo não encontrado", { status: 404 });

  if (!canAccessArquivo(meta.uploadadoPor, user.id, user.role ?? "")) {
    logAction("file_deleted", user.id, getClientIp(request), {
      error: "acesso negado",
      arquivoId: id,
    });
    return new Response("Sem permissão", { status: 403 });
  }

  const filePath = getArquivoFilePath(meta);
  if (!existsSync(filePath)) return new Response("Arquivo não encontrado", { status: 404 });

  const buffer = readFileSync(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": meta.tipo,
      "Content-Disposition": `inline; filename="${encodeURIComponent(meta.nome)}"`,
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

  if (!user?.id) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const meta = findArquivo(id);
  if (!meta) return Response.json({ error: "Arquivo não encontrado" }, { status: 404 });

  if (!canAccessArquivo(meta.uploadadoPor, user.id, user.role ?? "")) {
    return Response.json({ error: "Sem permissão" }, { status: 403 });
  }

  deleteArquivo(id);
  logAction("file_deleted", user.id, getClientIp(request), { arquivoId: id });
  return Response.json({ ok: true });
}
