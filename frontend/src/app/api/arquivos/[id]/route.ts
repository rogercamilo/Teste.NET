import { auth } from "@/auth";
import { findArquivo, deleteArquivo, getArquivoFilePath } from "@/lib/arquivos-store";
import { readFileSync, existsSync } from "fs";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Não autenticado", { status: 401 });
  }

  const { id } = await params;
  const meta = findArquivo(id);
  if (!meta) return new Response("Arquivo não encontrado", { status: 404 });

  const filePath = getArquivoFilePath(meta);
  if (!existsSync(filePath)) return new Response("Arquivo não encontrado", { status: 404 });

  const buffer = readFileSync(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": meta.tipo,
      "Content-Disposition": `inline; filename="${encodeURIComponent(meta.nome)}"`,
      "Content-Length": String(buffer.length),
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
  const meta = findArquivo(id);
  if (!meta) return Response.json({ error: "Arquivo não encontrado" }, { status: 404 });

  deleteArquivo(id);
  return Response.json({ ok: true });
}
