import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileBuffer, localFileExists, R2_ENABLED } from "@/lib/storage";
import { isValidId } from "@/lib/schemas";
import { logAction, logError, getClientIp } from "@/lib/audit-log";

type Params = { params: Promise<{ retiroPlanoId: string }> };

/**
 * Serve o MATERIAL DO FORMANDO de um retiro (comunitário ou pessoal) para o formando do
 * portal. Autorização pela PONTE de dados (nunca pelo id do arquivo, anti-IDOR):
 * só serve se existir RetiroMaterialLiberacao(retiro, grupoDoFormando) — ou seja,
 * um formador liberou o material para o grupo deste formando. O arquivo é buscado
 * pelo `materialFormandoAnexoId` do retiro, SEM filtrar por organização (o direito
 * de acesso vem da ponte; um plano global pode ter anexo fora do tenant).
 *
 * A sessão do portal é validada no proxy, que injeta `x-formando-id` /
 * `x-formando-org` (mesmo padrão dos demais endpoints do portal).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return new Response("Não autenticado", { status: 401 });
  }

  const { retiroPlanoId } = await params;
  if (!isValidId(retiroPlanoId)) {
    return new Response("Não encontrado", { status: 404 });
  }

  try {
    // Grupo atual do formando (a liberação é por grupo).
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
      select: { grupoFormacaoId: true },
    });
    if (!formando?.grupoFormacaoId) return new Response("Não encontrado", { status: 404 });

    // Ponte: o material deste retiro está liberado para o grupo do formando?
    const liberacao = await prisma.retiroMaterialLiberacao.findUnique({
      where: { retiroPlanoId_grupoFormacaoId: { retiroPlanoId, grupoFormacaoId: formando.grupoFormacaoId } },
      select: { id: true },
    });
    if (!liberacao) return new Response("Material não disponível", { status: 403 });

    const retiro = await prisma.retiroPlano.findUnique({
      where: { id: retiroPlanoId },
      select: { materialFormandoAnexoId: true },
    });
    const arquivoId = retiro?.materialFormandoAnexoId;
    if (!arquivoId) return new Response("Sem anexo", { status: 404 });

    // Sem escopo de org: o direito de acesso já foi provado pela ponte acima.
    const arquivo = await prisma.arquivo.findUnique({ where: { id: arquivoId } });
    if (!arquivo) return new Response("Arquivo não encontrado", { status: 404 });

    logAction("portal_retiro_material_baixado", undefined, getClientIp(request), { formandoId, retiroPlanoId, arquivoId }, organizacaoId);

    if (!R2_ENABLED && !(await localFileExists(arquivo.storageKey))) {
      return new Response("Arquivo não encontrado no servidor", { status: 404 });
    }
    const buffer = await readFileBuffer(arquivo.storageKey);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": arquivo.tipo,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logError("portal/retiros/material GET", err);
    return new Response("Falha ao carregar material", { status: 500 });
  }
}
