import "server-only";

import { prisma } from "./prisma";
import { criarNotificacao } from "./notificacoes";
import { logError } from "./audit-log";

/**
 * RSVP público por deep link (item 1.3).
 *
 * Confirma presença / avisa ausência a partir do `tokenAssinatura` do formando
 * (mesmo token do fluxo de notificações), sem login. Espelha o RSVP do Portal
 * (`PresencaFormacao.confirmacaoFormando` / `justificativaFormando`), mas faz
 * UPSERT — a linha de presença normalmente ainda não existe no horário do
 * lembrete (é criada lazily pelo formador). A "verdade" de `presente` continua
 * sendo do formador; aqui só gravamos a resposta do formando.
 */

export type RsvpResposta = "sim" | "nao";

export interface RsvpResultado {
  ok: boolean;
  status: number;
  error?: string;
  formandoNome?: string;
  agendamentoTema?: string;
  resposta?: RsvpResposta;
}

export async function registrarRsvpPorToken(input: {
  token: string;
  agendamentoId: string;
  resposta: RsvpResposta;
  justificativa?: string;
}): Promise<RsvpResultado> {
  const { token, agendamentoId, resposta } = input;

  if (resposta !== "sim" && resposta !== "nao") {
    return { ok: false, status: 400, error: "Resposta inválida" };
  }

  const justificativa =
    typeof input.justificativa === "string" ? input.justificativa.trim() : "";
  if (justificativa && (justificativa.length < 3 || justificativa.length > 500)) {
    return { ok: false, status: 400, error: "Motivo deve ter entre 3 e 500 caracteres." };
  }

  try {
    const formando = await prisma.formando.findUnique({
      where: { tokenAssinatura: token },
      select: {
        id: true,
        nome: true,
        organizacaoId: true,
        grupoFormacaoId: true,
        nivelFormativo: true,
        deletedAt: true,
      },
    });
    if (!formando || formando.deletedAt) {
      return { ok: false, status: 404, error: "Link inválido" };
    }

    // Agendamento precisa ser da MESMA org e relevante ao formando (grupo dele ou evento geral).
    const agendamento = await prisma.agendamento.findFirst({
      where: {
        id: agendamentoId,
        organizacaoId: formando.organizacaoId,
        deletedAt: null,
        OR: [{ grupoFormacaoId: null }, { grupoFormacaoId: formando.grupoFormacaoId }],
      },
      select: { id: true, formacaoTema: true, dataInicio: true, formadorId: true },
    });
    if (!agendamento) {
      return { ok: false, status: 404, error: "Encontro não encontrado" };
    }

    const confirmacaoFormando = resposta === "sim";

    await prisma.presencaFormacao.upsert({
      where: { agendamentoId_formandoId: { agendamentoId: agendamento.id, formandoId: formando.id } },
      create: {
        organizacaoId: formando.organizacaoId,
        agendamentoId: agendamento.id,
        formacaoTema: agendamento.formacaoTema,
        data: agendamento.dataInicio,
        formandoId: formando.id,
        formandoNome: formando.nome,
        nivelFormativo: formando.nivelFormativo,
        presente: false,
        confirmacaoFormando,
        justificativaFormando: !confirmacaoFormando && justificativa ? justificativa : null,
      },
      update: {
        confirmacaoFormando,
        ...(!confirmacaoFormando ? { justificativaFormando: justificativa || null } : {}),
      },
    });

    // Ausência avisada → notifica o formador responsável (best-effort).
    if (!confirmacaoFormando && agendamento.formadorId) {
      const corpo = justificativa
        ? `"${justificativa.slice(0, 100)}${justificativa.length > 100 ? "…" : ""}"`
        : `${formando.nome} avisou que não poderá comparecer.`;
      criarNotificacao({
        organizacaoId: formando.organizacaoId,
        destinatarioId: agendamento.formadorId,
        tipo: "justificativa_formando",
        titulo: `${formando.nome} não vai comparecer`,
        corpo,
        linkAcao: `/presenca?agendamento=${agendamento.id}`,
      }).catch((err) => logError("rsvp:notificar", err));
    }

    return {
      ok: true,
      status: 200,
      formandoNome: formando.nome,
      agendamentoTema: agendamento.formacaoTema,
      resposta,
    };
  } catch (err) {
    logError("rsvp:registrar", err, { agendamentoId });
    return { ok: false, status: 500, error: "Falha ao registrar resposta" };
  }
}
