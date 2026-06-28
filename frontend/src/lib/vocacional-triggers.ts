import { prisma } from "@/lib/prisma";
import { sendPushToOrg } from "@/lib/push";

const TIPOS_RETIRO = ["retiro-comunitario", "retiro-pessoal"];

/**
 * Gatilho do "último retiro": ao marcar realizado um retiro de uma turma
 * vocacional, se o total de retiros realizados atingiu o previsto
 * (`vocacionalTotalRetiros`), abre o recebimento da carta para cada vocacionado
 * ativo (status `ativa` → `aguardando_carta`) e notifica o formador.
 *
 * Best-effort: nunca lança — falhas aqui não devem quebrar a atualização da agenda.
 */
export async function verificarUltimoRetiroVocacional(grupoFormacaoId: string): Promise<void> {
  try {
    const turma = await prisma.grupoFormacao.findUnique({
      where: { id: grupoFormacaoId },
      select: { id: true, organizacaoId: true, tipo: true, vocacionalTotalRetiros: true, nome: true },
    });
    if (!turma || turma.tipo !== "vocacional" || !turma.vocacionalTotalRetiros) return;

    const retirosRealizados = await prisma.agendamento.count({
      where: {
        grupoFormacaoId: turma.id,
        organizacaoId: turma.organizacaoId,
        deletedAt: null,
        status: "realizada",
        tipoFormacao: { in: TIPOS_RETIRO },
      },
    });
    if (retirosRealizados < turma.vocacionalTotalRetiros) return;

    const res = await prisma.participacaoVocacional.updateMany({
      where: { turmaId: turma.id, organizacaoId: turma.organizacaoId, status: "ativa" },
      data: { status: "aguardando_carta" },
    });

    if (res.count > 0) {
      sendPushToOrg(turma.organizacaoId, {
        titulo: "Período Vocacional",
        corpo: `Último retiro realizado na turma ${turma.nome}. Recolha as cartas de discernimento dos vocacionados.`,
        url: `/vocacional/${turma.id}`,
      }).catch(() => {});
    }
  } catch {
    // silencioso — gatilho é acessório
  }
}
