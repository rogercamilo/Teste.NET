import "server-only";

import { prisma } from "./prisma";
import { sendPushToOrg, sendPushToGroup } from "./push";
import { sendAgendamentoReminderEmail, type ReminderQuando } from "./email";
import { formadorDoGrupo, criarNotificacao } from "./notificacoes";
import { formatDataBr } from "./utils";
import { logError } from "./audit-log";

/**
 * Engine de lembretes de agenda (item 1.2 do backlog pós-GTM).
 *
 * Para cada `Agendamento` com `status = "agendada"`, dispara dois lembretes —
 * ~24h e ~2h antes — por Web Push + e-mail (com `.ics` anexado). Os
 * destinatários espelham o escopo do agendamento:
 *   - `grupoFormacaoId = null` → geral/org (todos os formandos ativos + push org)
 *   - `grupoFormacaoId` set    → grupo (formandos do grupo + push do grupo) e o
 *                                 Formador Comunitário do grupo (bell + e-mail)
 *
 * Idempotência via flags `lembrete24hEnviado`/`lembrete2hEnviado` no próprio
 * agendamento — a flag é marcada após a tentativa de envio, então uma reexecução
 * do cron não reenvia. É executada por um cron de plataforma (varre todas as
 * orgs), não por request de tenant.
 */

const HORA_MS = 60 * 60 * 1000;

/** Campos do agendamento necessários para montar push, e-mail e `.ics`. */
const REMINDER_SELECT = {
  id: true,
  organizacaoId: true,
  grupoFormacaoId: true,
  formacaoTema: true,
  dataInicio: true,
  dataFim: true,
  local: true,
  linkOnline: true,
} as const;

type ReminderRow = {
  id: string;
  organizacaoId: string;
  grupoFormacaoId: string | null;
  formacaoTema: string;
  dataInicio: Date;
  dataFim: Date;
  local: string | null;
  linkOnline: string | null;
};

export interface ReminderSummary {
  agendamentos: number;
  emails: number;
  push: number;
}

/** Dispara os lembretes cujas janelas T-24h/T-2h estão ativas em `now`. */
export async function checkAndSendReminders(now: Date = new Date()): Promise<ReminderSummary> {
  const summary: ReminderSummary = { agendamentos: 0, emails: 0, push: 0 };

  // T-24h: entre now+2h e now+24h. O piso de +2h evita lembrete duplo quando o
  // encontro é criado com menos de 24h de antecedência (aí só dispara o de 2h).
  const t24 = await prisma.agendamento.findMany({
    where: {
      status: "agendada",
      deletedAt: null,
      lembrete24hEnviado: false,
      dataInicio: { gt: new Date(now.getTime() + 2 * HORA_MS), lte: new Date(now.getTime() + 24 * HORA_MS) },
    },
    select: REMINDER_SELECT,
  });
  for (const row of t24) {
    await sendReminderForRow(row, "24h", summary);
    await prisma.agendamento
      .update({ where: { id: row.id }, data: { lembrete24hEnviado: true } })
      .catch((err) => logError("agendamento-reminders:flag24", err, { id: row.id }));
  }

  // T-2h: qualquer encontro futuro dentro das próximas 2h.
  const t2 = await prisma.agendamento.findMany({
    where: {
      status: "agendada",
      deletedAt: null,
      lembrete2hEnviado: false,
      dataInicio: { gt: now, lte: new Date(now.getTime() + 2 * HORA_MS) },
    },
    select: REMINDER_SELECT,
  });
  for (const row of t2) {
    await sendReminderForRow(row, "2h", summary);
    await prisma.agendamento
      .update({ where: { id: row.id }, data: { lembrete2hEnviado: true } })
      .catch((err) => logError("agendamento-reminders:flag2", err, { id: row.id }));
  }

  return summary;
}

async function sendReminderForRow(
  row: ReminderRow,
  quando: ReminderQuando,
  summary: ReminderSummary
): Promise<void> {
  summary.agendamentos++;
  try {
    const r = await dispatchReminder(row, quando);
    summary.emails += r.emails;
    summary.push += r.push;
  } catch (err) {
    // Nunca deixa uma org quebrada bloquear as demais; a flag ainda é marcada.
    logError("agendamento-reminders:dispatch", err, { id: row.id, quando });
  }
}

async function dispatchReminder(
  row: ReminderRow,
  quando: ReminderQuando
): Promise<{ emails: number; push: number }> {
  const org = row.organizacaoId;
  const tema = row.formacaoTema || "Encontro formativo";
  const quandoTitulo = quando === "24h" ? "Encontro amanhã" : "Encontro em cerca de 2h";
  const pushPayload = {
    titulo: `Lembrete · ${quandoTitulo}`,
    corpo: `${tema} — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
    url: "/agenda",
  };

  let emails = 0;
  let push = 0;

  let formandos: { nome: string; email: string }[];

  if (row.grupoFormacaoId) {
    // Escopo de grupo: push + e-mail aos formandos do grupo; bell + e-mail ao FC.
    const p = await sendPushToGroup(org, row.grupoFormacaoId, pushPayload).catch(() => null);
    if (p) push += p.sent;

    formandos = await prisma.formando.findMany({
      where: { organizacaoId: org, grupoFormacaoId: row.grupoFormacaoId, ativo: true, deletedAt: null, email: { not: "" } },
      select: { nome: true, email: true },
    });

    const fcId = await formadorDoGrupo(row.grupoFormacaoId).catch(() => null);
    if (fcId) {
      await criarNotificacao({
        organizacaoId: org,
        destinatarioId: fcId,
        tipo: "novo_agendamento",
        titulo: `Lembrete: ${quandoTitulo.toLowerCase()}`,
        corpo: `${tema} — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
        linkAcao: "/agenda",
      }).catch(() => {});
      const fc = await prisma.usuario
        .findUnique({ where: { id: fcId }, select: { nome: true, email: true } })
        .catch(() => null);
      if (fc?.email) {
        const r = await sendAgendamentoReminderEmail({ organizacaoId: org, email: fc.email, nome: fc.nome, agendamento: row, quando });
        if (r.sent) emails++;
      }
    }
  } else {
    // Escopo geral (org inteira): push à org + e-mail a todos os formandos ativos.
    const p = await sendPushToOrg(org, pushPayload).catch(() => null);
    if (p) push += p.sent;

    formandos = await prisma.formando.findMany({
      where: { organizacaoId: org, ativo: true, deletedAt: null, email: { not: "" } },
      select: { nome: true, email: true },
    });
  }

  for (const f of formandos) {
    if (!f.email) continue;
    const r = await sendAgendamentoReminderEmail({
      organizacaoId: org,
      email: f.email,
      nome: f.nome,
      agendamento: row,
      quando,
    }).catch(() => ({ sent: false }));
    if (r.sent) emails++;
  }

  return { emails, push };
}
