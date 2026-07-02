import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateAgendamentoSchema, parseJson } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import type { Agendamento } from "@/types";
import { sendPushToOrg } from "@/lib/push";
import { formatDataBr } from "@/lib/utils";
import { criarNotificacao, formadorDoGrupo } from "@/lib/notificacoes";
import { formandosAlvo } from "@/lib/agendamento-reminders";
import { sendAgendamentoCriadoEmail } from "@/lib/email";

import { SessionUser as SU } from "@/lib/auth-helpers";

import { toAgendamento as toAg } from "@/lib/converters";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const where: Record<string, unknown> = { organizacaoId: user.organizacaoId, deletedAt: null };
    if (user.role === "formador_comunitario") {
      where.grupoFormacaoId = user.grupoFormacaoId ?? null;
    }
    const orderBy = { dataInicio: "asc" as const };

    if (!pagination) {
      const rows = await prisma.agendamento.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toAg));
    }

    const [rows, total] = await Promise.all([
      prisma.agendamento.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.agendamento.count({ where }),
    ]);
    return NextResponse.json(rows.map(toAg), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("agendamentos GET", err);
    return NextResponse.json({ error: "Falha ao carregar agendamentos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, CreateAgendamentoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    if (user.role === "formador_comunitario" && body.grupoFormacaoId && body.grupoFormacaoId !== user.grupoFormacaoId) {
      return NextResponse.json({ error: "Sem permissão para criar agendamento em outra morada" }, { status: 403 });
    }

    const formacao = await prisma.formacao.findFirst({
      where: { id: body.formacaoId, deletedAt: null, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      select: { id: true },
    });
    if (!formacao) return NextResponse.json({ error: "Formação não encontrada" }, { status: 404 });

    // formadorId is always the authenticated user; formadorNome resolved server-side.
    if (!user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const formadorId = user.id;
    const formadorUser = await prisma.usuario.findUnique({
      where: { id: formadorId },
      select: { nome: true },
    });
    const formadorNome = formadorUser?.nome ?? "";

    const row = await prisma.agendamento.create({
      data: {
        organizacaoId: user.organizacaoId,
        formacaoId: body.formacaoId,
        formacaoTema: body.formacaoTema ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: body.tipoFormacao ?? "comunitaria",
        formadorId,
        formadorNome,
        grupoFormacaoId: body.grupoFormacaoId ?? user.grupoFormacaoId ?? null,
        dataInicio: new Date(body.dataInicio),
        dataFim: new Date(body.dataFim ?? body.dataInicio),
        local: body.local ?? null,
        linkOnline: body.linkOnline ?? null,
        status: body.status ?? "agendada",
        participantes: body.participantes ?? 0,
        observacoes: body.observacoes ?? null,
        googleCalendarEventId: body.googleCalendarEventId ?? null,
      },
    });
    logAction("agendamento_created", user.id, getClientIp(request), { formacaoId: body.formacaoId }, user.organizacaoId);

    // Bell: notifica FC do grupo (apenas se foi Admin/FG que agendou, não o próprio FC)
    if (row.grupoFormacaoId && user.role !== "formador_comunitario") {
      formadorDoGrupo(row.grupoFormacaoId).then((fcId) => {
        if (!fcId) return;
        criarNotificacao({
          organizacaoId: user.organizacaoId!,
          destinatarioId: fcId,
          tipo: "novo_agendamento",
          titulo: "Nova formação agendada para seu grupo",
          corpo: `${row.formacaoTema} — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
          linkAcao: "/agenda",
        });
      }).catch(() => {});
    }

    // Notificação push — fire-and-forget
    sendPushToOrg(user.organizacaoId, {
      titulo: `Nova formação agendada`,
      corpo: `${row.formacaoTema} — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
      url: "/agenda",
    }).catch(() => {});

    // E-mail de criação aos formandos — só se o FG manteve o opt-in (item 1.6).
    // Fire-and-forget: não bloqueia a resposta 201.
    void notificarCriacaoPorEmail(row);

    return NextResponse.json(toAg(row), { status: 201 });
  } catch (err) {
    logError("agendamentos POST", err);
    return NextResponse.json({ error: "Falha ao criar agendamento" }, { status: 500 });
  }
}

/**
 * E-mail de criação de agendamento aos formandos-alvo (item 1.6) — respeitando o
 * opt-in do Formador Geral (`emailAgendamentoAtivo`). Best-effort; erros não
 * afetam a criação (chamado com `void`).
 */
async function notificarCriacaoPorEmail(row: {
  id: string;
  organizacaoId: string;
  grupoFormacaoId: string | null;
  formacaoTema: string;
  dataInicio: Date;
  dataFim: Date;
  local: string | null;
  linkOnline: string | null;
}): Promise<void> {
  try {
    const org = await prisma.organizacao.findUnique({
      where: { id: row.organizacaoId },
      select: { emailAgendamentoAtivo: true },
    });
    if (!org?.emailAgendamentoAtivo) return;

    const formandos = await formandosAlvo(row.organizacaoId, row.grupoFormacaoId);
    for (const f of formandos) {
      if (!f.email) continue;
      await sendAgendamentoCriadoEmail({
        organizacaoId: row.organizacaoId,
        email: f.email,
        nome: f.nome,
        agendamento: {
          id: row.id,
          formacaoTema: row.formacaoTema,
          dataInicio: row.dataInicio,
          dataFim: row.dataFim,
          local: row.local,
          linkOnline: row.linkOnline,
        },
        rsvpToken: f.tokenAssinatura ?? undefined,
      }).catch(() => {});
    }
  } catch (err) {
    logError("agendamentos:email-criacao", err);
  }
}
