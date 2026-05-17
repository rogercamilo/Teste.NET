import { auth } from "@/auth";
import {
  findDocumento,
  deleteDocumento,
  getDocumentoFilePath,
} from "@/lib/documentos-store";
import { existsSync, readFileSync } from "fs";
import { type NextRequest } from "next/server";

type SessionUser = {
  id?: string;
  role?: string;
  moradaId?: string | null;
};

function canRead(
  meta: { moradaId?: string; uploadadoPor: string },
  user: SessionUser
): boolean {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  if (meta.uploadadoPor === user.id) return true;
  if (meta.moradaId && meta.moradaId === user.moradaId) return true;
  return false;
}

function canDelete(
  meta: { uploadadoPor: string },
  user: SessionUser
): boolean {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  if (meta.uploadadoPor === user.id) return true;
  return false;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const meta = findDocumento(id);

  if (!meta) {
    return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  const user = session.user as SessionUser;
  if (!canRead(meta, user)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  const filePath = getDocumentoFilePath(meta);
  if (!existsSync(filePath)) {
    return Response.json({ error: "Arquivo não encontrado no servidor" }, { status: 404 });
  }

  const fileBuffer = readFileSync(filePath);

  return new Response(fileBuffer, {
    headers: {
      "Content-Type": meta.tipo,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.nome)}`,
      "Content-Length": String(meta.tamanho),
      "Cache-Control": "private, no-cache",
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const meta = findDocumento(id);

  if (!meta) {
    return Response.json({ error: "Documento não encontrado" }, { status: 404 });
  }

  const user = session.user as SessionUser;
  if (!canDelete(meta, user)) {
    return Response.json({ error: "Acesso negado" }, { status: 403 });
  }

  deleteDocumento(id);
  return Response.json({ ok: true });
}
