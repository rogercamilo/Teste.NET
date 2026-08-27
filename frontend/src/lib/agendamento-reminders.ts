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
  grupos: { select: { grupoFormacaoId: true } },
  formacaoTema: true,
  dataInicio: true,
  dataFim: true,
  diaInteiro: true,
  local: true,
  linkOnline: true,
} as const;

type ReminderRow = {
  id: string;
  organizacaoId: string;
  grupoFormacaoId: string | null;
  grupos: { grupoFormacaoId: string }[];
  formacaoTema: string;
  dataInicio: Date;
  dataFim: Date;
  diaInteiro: boolean;
  local: string | null;
  linkOnline: string | null;
};

/**
 * Grupos-alvo de um agendamento (item 1.7): a junção é a fonte da verdade;
 * cai no `grupoFormacaoId` legado se a junção estiver vazia. Array vazio = org.
 */
export function gruposAlvo(row: { grupoFormacaoId: string | null; grupos?: { grupoFormacaoId: string }[] }): string[] {
  const daJuncao = row.grupos?.map((g) => g.grupoFormacaoId) ?? [];
  if (daJuncao.length > 0) return daJuncao;
  return row.grupoFormacaoId ? [row.grupoFormacaoId] : [];
}

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
  if (t24.length === 0 && t2.length === 0) return summary;

  // Item 1.6: orgs que desligaram o opt-in de e-mails de agenda pulam o e-mail
  // ao formando (push e bell seguem). Uma query dos orgs distintos do lote.
  const orgIds = [...new Set([...t24, ...t2].map((r) => r.organizacaoId))];
  const emailOff = new Set(
    (
      await prisma.organizacao.findMany({
        where: { id: { in: orgIds }, emailAgendamentoAtivo: false },
        select: { id: true },
      })
    ).map((o) => o.id)
  );

  for (const row of t24) {
    await sendReminderForRow(row, "24h", summary, !emailOff.has(row.organizacaoId));
    await prisma.agendamento
      .update({ where: { id: row.id }, data: { lembrete24hEnviado: true } })
      .catch((err) => logError("agendamento-reminders:flag24", err, { id: row.id }));
  }
  for (const row of t2) {
    await sendReminderForRow(row, "2h", summary, !emailOff.has(row.organizacaoId));
    await prisma.agendamento
      .update({ where: { id: row.id }, data: { lembrete2hEnviado: true } })
      .catch((err) => logError("agendamento-reminders:flag2", err, { id: row.id }));
  }

  return summary;
}

async function sendReminderForRow(
  row: ReminderRow,
  quando: ReminderQuando,
  summary: ReminderSummary,
  emailAtivo: boolean
): Promise<void> {
  summary.agendamentos++;
  try {
    const r = await dispatchReminder(row, quando, emailAtivo);
    summary.emails += r.emails;
    summary.push += r.push;
  } catch (err) {
    // Nunca deixa uma org quebrada bloquear as demais; a flag ainda é marcada.
    logError("agendamento-reminders:dispatch", err, { id: row.id, quando });
  }
}

async function dispatchReminder(
  row: ReminderRow,
  quando: ReminderQuando,
  emailAtivo: boolean
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

  const grupos = gruposAlvo(row);

  if (grupos.length > 0) {
    // Escopo de grupo(s) (item 1.7): push a cada grupo; bell + e-mail ao FC de
    // cada grupo (staff, sempre), deduplicando FCs que cubram vários grupos.
    const fcIds = new Set<string>();
    for (const gid of grupos) {
      const p = await sendPushToGroup(org, gid, pushPayload).catch(() => null);
      if (p) push += p.sent;
      const fcId = await formadorDoGrupo(gid).catch(() => null);
      if (fcId) fcIds.add(fcId);
    }
    for (const fcId of fcIds) {
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
    // Escopo geral (org inteira): push à org.
    const p = await sendPushToOrg(org, pushPayload).catch(() => null);
    if (p) push += p.sent;
  }

  // E-mail aos formandos — só quando o opt-in de e-mails de agenda está ligado (item 1.6).
  if (emailAtivo) {
    const formandos = await formandosAlvo(org, grupos);
    for (const f of formandos) {
      if (!f.email) continue;
      const r = await sendAgendamentoReminderEmail({
        organizacaoId: org,
        email: f.email,
        nome: f.nome,
        agendamento: row,
        quando,
        rsvpToken: f.tokenAssinatura ?? undefined,
      }).catch(() => ({ sent: false }));
      if (r.sent) emails++;
    }
  }

  return { emails, push };
}

/**
 * Formandos-alvo de um agendamento para e-mail: dos grupos-alvo (união, item
 * 1.7) ou de toda a org quando a lista está vazia (evento geral). Só ativos, com
 * e-mail. Reutilizado pela criação (1.6).
 */
export async function formandosAlvo(
  organizacaoId: string,
  grupoFormacaoIds: string[]
): Promise<{ nome: string; email: string; tokenAssinatura: string | null }[]> {
  return prisma.formando.findMany({
    where: {
      organizacaoId,
      ...(grupoFormacaoIds.length > 0 ? { grupoFormacaoId: { in: grupoFormacaoIds } } : {}),
      ativo: true,
      deletedAt: null,
      email: { not: "" },
    },
    select: { nome: true, email: true, tokenAssinatura: true },
  });
}
