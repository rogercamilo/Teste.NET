import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileBuffer, localFileExists, R2_ENABLED } from "@/lib/storage";
import { isValidId } from "@/lib/schemas";
import { logAction, logError, getClientIp } from "@/lib/audit-log";

type Params = { params: Promise<{ agendamentoId: string }> };

/**
 * Serve o anexo (documento de apoio) de uma formação já realizada para o
 * formando do portal. A autorização é pela PONTE de dados, nunca pelo id do
 * arquivo (evita IDOR): só serve se existir `PresencaFormacao(formando, agendamento)`
 * — ou seja, o formando foi escalado para aquele encontro — E o encontro já
 * ocorreu (a partir do dia agendado). O arquivo é buscado pelo `documentoAnexoId`
 * da formação vinculada, SEM filtrar por organização: uma formação global pode
 * ter anexo fora do tenant do formando, e o direito de acesso vem da ponte.
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

  const { agendamentoId } = await params;
  if (!isValidId(agendamentoId)) {
    return new Response("Não encontrado", { status: 404 });
  }

  try {
    // Ponte: o formando foi escalado para este encontro?
    const presenca = await prisma.presencaFormacao.findFirst({
      where: { agendamentoId, formandoId, organizacaoId },
      select: { data: true },
    });
    if (!presenca) return new Response("Não encontrado", { status: 404 });

    // O material só abre a partir do dia agendado para o encontro.
    if (presenca.data.getTime() > Date.now()) {
      // Encontro ainda não chegou: comparação por horário é suficiente aqui
      // (uma requisição só ocorre depois que a listagem já liberou o item).
      return new Response("Material ainda não disponível", { status: 403 });
    }

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, deletedAt: null },
      select: { formacao: { select: { documentoAnexoId: true } } },
    });
    const arquivoId = agendamento?.formacao?.documentoAnexoId;
    if (!arquivoId) return new Response("Sem anexo", { status: 404 });

    // Sem escopo de org: o direito de acesso já foi provado pela ponte acima.
    const arquivo = await prisma.arquivo.findUnique({ where: { id: arquivoId } });
    if (!arquivo) return new Response("Arquivo não encontrado", { status: 404 });

    logAction("portal_material_visualizado", undefined, getClientIp(request), { formandoId, agendamentoId, arquivoId }, organizacaoId);

    // Serve os bytes SAME-ORIGIN (do R2 ou do disco), sem redirect: o
    // visualizador pdf.js do portal busca o arquivo por fetch e um 302 → R2
    // esbarraria no CORS. Material do portal é sempre leitura inline.
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
    logError("portal/formacoes/material GET", err);
    return new Response("Falha ao carregar material", { status: 500 });
  }
}
