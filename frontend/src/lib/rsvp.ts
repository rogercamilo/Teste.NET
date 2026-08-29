import "server-only";

import { prisma } from "./prisma";
import { criarNotificacao } from "./notificacoes";
import { logError } from "./audit-log";
import { agendamentoRelevanteOR } from "./agendamento-scope";

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

    // Agendamento precisa ser da MESMA org e relevante ao formando: evento geral
    // de verdade (sem junção) OU um dos grupos-alvo é o do formando (item 1.7).
    // A junção é a fonte da verdade — single-group também tem linha de junção
    // (criada na POST e no backfill), então cobre legado + multi.
    const agendamento = await prisma.agendamento.findFirst({
      where: {
        id: agendamentoId,
        organizacaoId: formando.organizacaoId,
        deletedAt: null,
        OR: [
          { grupoFormacaoId: null, grupos: { none: {} } },
          ...(formando.grupoFormacaoId
            ? [{ grupos: { some: { grupoFormacaoId: formando.grupoFormacaoId } } }]
            : []),
        ],
      },
      select: { id: true, formacaoTema: true, dataInicio: true, formadorId: true },
    });
    if (!agendamento) {
      return { ok: false, status: 404, error: "Encontro não encontrado" };
    }

    await aplicarRespostaPresenca(formando, agendamento, resposta, justificativa);

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

/** Formando resolvido para gravar a resposta de presença. */
type FormandoResposta = {
  id: string;
  nome: string;
  organizacaoId: string;
  nivelFormativo: string;
  grupoFormacaoId: string | null;
};

/** Agendamento já validado (escopo do formando) para gravar a resposta. */
type AgendamentoResposta = {
  id: string;
  formacaoTema: string;
  dataInicio: Date;
  formadorId: string | null;
};

/**
 * Grava a resposta do formando (UPSERT — a linha de presença normalmente ainda
 * não existe) e, quando é ausência, avisa o formador responsável. Núcleo
 * compartilhado pelo RSVP por token (e-mail/deep link) e pelo RSVP autenticado
 * do portal. A "verdade" de `presente` continua sendo do formador.
 */
async function aplicarRespostaPresenca(
  formando: FormandoResposta,
  agendamento: AgendamentoResposta,
  resposta: RsvpResposta,
  justificativa: string
): Promise<void> {
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
    // Frase completa: quem + o quê + quando (mais fácil de entender numa olhada).
    const dataEncontro = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(agendamento.dataInicio);
    const primeiroNome = formando.nome.split(" ")[0];
    const corpo = justificativa
      ? `Motivo: "${justificativa.slice(0, 140)}${justificativa.length > 140 ? "…" : ""}"`
      : `${primeiroNome} avisou que não poderá comparecer ao encontro "${agendamento.formacaoTema}".`;
    criarNotificacao({
      organizacaoId: formando.organizacaoId,
      destinatarioId: agendamento.formadorId,
      tipo: "justificativa_formando",
      titulo: `${formando.nome} vai faltar em ${dataEncontro}`,
      corpo,
      // Chamada agora vive na aba Presença da morada.
      linkAcao: formando.grupoFormacaoId
        ? `/grupos-formacao/${formando.grupoFormacaoId}?tab=presenca`
        : `/grupos-formacao`,
    }).catch((err) => logError("rsvp:notificar", err));
  }
}

/**
 * RSVP autenticado do Portal do Formando/Vocacionado — fecha o ciclo do web
 * push: o formando abre o portal e confirma presença (ou avisa ausência) em
 * qualquer evento FUTURO em que está envolvido, mesmo antes de o formador marcar
 * (a linha de presença é criada aqui via UPSERT). O escopo de "envolvido" é o
 * mesmo da visibilidade (`agendamentoRelevanteOR`), então "o que vê, pode
 * responder".
 */
export async function registrarRespostaPresencaPortal(input: {
  formandoId: string;
  organizacaoId: string;
  agendamentoId: string;
  resposta: RsvpResposta;
  justificativa?: string;
}): Promise<RsvpResultado> {
  const { formandoId, organizacaoId, agendamentoId, resposta } = input;

  if (resposta !== "sim" && resposta !== "nao") {
    return { ok: false, status: 400, error: "Resposta inválida" };
  }
  const justificativa =
    typeof input.justificativa === "string" ? input.justificativa.trim() : "";
  // Ausência exige motivo; confirmação nunca envia motivo.
  if (resposta === "nao" && (justificativa.length < 3 || justificativa.length > 500)) {
    return { ok: false, status: 400, error: "Justificativa deve ter entre 3 e 500 caracteres." };
  }

  try {
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId, deletedAt: null },
      select: { id: true, nome: true, organizacaoId: true, grupoFormacaoId: true, nivelFormativo: true },
    });
    if (!formando) return { ok: false, status: 404, error: "Formando não encontrado" };

    const agendamento = await prisma.agendamento.findFirst({
      where: {
        id: agendamentoId,
        organizacaoId,
        deletedAt: null,
        OR: agendamentoRelevanteOR(formando),
      },
      select: { id: true, formacaoTema: true, dataInicio: true, formadorId: true },
    });
    if (!agendamento) return { ok: false, status: 404, error: "Encontro não encontrado" };

    await aplicarRespostaPresenca(formando, agendamento, resposta, justificativa);

    return {
      ok: true,
      status: 200,
      formandoNome: formando.nome,
      agendamentoTema: agendamento.formacaoTema,
      resposta,
    };
  } catch (err) {
    logError("rsvp:portal", err, { agendamentoId });
    return { ok: false, status: 500, error: "Falha ao registrar resposta" };
  }
}
