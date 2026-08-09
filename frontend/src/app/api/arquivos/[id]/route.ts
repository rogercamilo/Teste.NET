import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, readLocalFile, localFileExists } from "@/lib/storage";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";
import { SessionUser } from "@/lib/auth-helpers";
import { type NextRequest } from "next/server";

function canDelete(arquivo: { uploadedById: string | null }, user: SessionUser): boolean {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  return arquivo.uploadedById === user.id;
}

/**
 * Controle de leitura alinhado ao padrão de `documentos/[id]` (menor privilégio),
 * mas ciente da entidade anexada — arquivos não guardam `grupoFormacaoId` próprio:
 *  - Gestão (admin/formador_geral): tudo na org.
 *  - Autor: o que subiu.
 *  - FC: recursos de currículo da org (formacao/grade/plano) são compartilhados;
 *    entidades de grupo (morada/formando) só do PRÓPRIO grupo.
 */
async function canRead(
  arquivo: { uploadedById: string | null; entityType: string | null; entityId: string | null; formandoId: string | null },
  user: SessionUser
): Promise<boolean> {
  if (user.role === "administrador" || user.role === "formador_geral") return true;
  if (arquivo.uploadedById === user.id) return true;
  // Anexos de formando (cartas de etapa, anexos de evento) vinculam por
  // `formandoId` — sem entityType/entityId. FC lê os do PRÓPRIO grupo.
  if (arquivo.formandoId) {
    const f = await prisma.formando.findFirst({
      where: { id: arquivo.formandoId, organizacaoId: user.organizacaoId },
      select: { grupoFormacaoId: true },
    });
    return !!f && f.grupoFormacaoId === user.grupoFormacaoId;
  }
  // Sem entidade associada (ex.: linha do tipo `documentos`): FC não tem grant por entidade.
  if (!arquivo.entityType || !arquivo.entityId) return false;

  switch (arquivo.entityType) {
    case "formacao":
    case "grade":
    case "plano":
      return true; // currículo compartilhado na org
    case "morada": // entityId é o id do GrupoFormacao (nome legado)
      return arquivo.entityId === user.grupoFormacaoId;
    case "formando": {
      const f = await prisma.formando.findFirst({
        where: { id: arquivo.entityId, organizacaoId: user.organizacaoId },
        select: { grupoFormacaoId: true },
      });
      return !!f && f.grupoFormacaoId === user.grupoFormacaoId;
    }
    default:
      return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return new Response("Não autenticado", { status: 401 });

  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });

  // Modo `?url=1`: retorna a URL de acesso em JSON em vez de redirecionar. O
  // visualizador aponta o <iframe> DIRETO para o R2 (que serve o PDF com range
  // nativo), tirando o app do caminho de transferência e eliminando a indireção
  // de redirect que atrapalhava o streaming progressivo do pdf.js.
  const wantsJson = request.nextUrl.searchParams.get("url") === "1";
  // `?download=1`: força o download (Content-Disposition: attachment) em vez de
  // abrir o arquivo inline no navegador.
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";

  try {
    const arquivo = await prisma.arquivo.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
      select: {
        id: true, storageKey: true, tipo: true, nome: true,
        uploadedById: true, entityType: true, entityId: true, formandoId: true,
      },
    });

    if (!arquivo) return new Response("Arquivo não encontrado", { status: 404 });
    if (!(await canRead(arquivo, user))) return new Response("Acesso negado", { status: 403 });

    // R2: gera pre-signed URL em tempo real (assinatura local, sem rede)
    if (
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
    ) {
      const { getFileUrl } = await import("@/lib/storage");
      const url = await getFileUrl(arquivo.storageKey, arquivo.id, 900, wantsDownload ? arquivo.nome : undefined);
      const expectedPrefix = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      if (!url.startsWith(expectedPrefix)) {
        return new Response("URL de redirecionamento inválida", { status: 500 });
      }
      if (wantsJson) {
        return Response.json({ url }, { headers: { "Cache-Control": "private, no-store" } });
      }
      return Response.redirect(url, 302);
    }

    // Local: serve o arquivo diretamente do disco
    if (wantsJson) {
      return Response.json({ url: `/api/arquivos/${arquivo.id}` }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (!await localFileExists(arquivo.storageKey)) {
      return new Response("Arquivo não encontrado no servidor", { status: 404 });
    }

    const buffer = await readLocalFile(arquivo.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": arquivo.tipo,
        "Content-Disposition": `${wantsDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    logError("arquivos/[id] GET", err);
    return new Response("Falha ao carregar arquivo", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id) return Response.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) return Response.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  const arquivo = await prisma.arquivo.findFirst({
    where: { id, organizacaoId: user.organizacaoId },
  });

  if (!arquivo) return Response.json({ error: "Arquivo não encontrado" }, { status: 404 });
  if (!canDelete(arquivo, user)) return Response.json({ error: "Sem permissão" }, { status: 403 });

  try {
    // Remove o registro do banco primeiro; se falhar, o arquivo no storage permanece intacto
    await prisma.arquivo.delete({ where: { id } });
    // Remoção do storage é best-effort — registro já foi removido do banco
    deleteFile(arquivo.storageKey).catch((err) => logError("arquivos/[id] DELETE storage", err));
    logAction("file_deleted", user.id, getClientIp(request), { arquivoId: id }, user.organizacaoId);
    return Response.json({ ok: true });
  } catch (err) {
    logError("arquivos/[id] DELETE", err);
    return Response.json({ error: "Falha ao excluir arquivo" }, { status: 500 });
  }
}
