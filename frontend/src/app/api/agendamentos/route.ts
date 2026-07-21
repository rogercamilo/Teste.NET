import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateAgendamentoSchema, parseJson } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
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
      const gid = user.grupoFormacaoId ?? null;
      // Vê os agendamentos do próprio grupo — legado (grupoFormacaoId) OU via
      // junção multi-grupo (item 1.7). Sem grupo, mantém o escopo org-wide legado.
      if (gid) {
        where.OR = [{ grupoFormacaoId: gid }, { grupos: { some: { grupoFormacaoId: gid } } }];
      } else {
        where.grupoFormacaoId = null;
      }
    }
    const orderBy = { dataInicio: "asc" as const };
    const include = { grupos: { select: { grupoFormacaoId: true } } } as const;

    if (!pagination) {
      const rows = await prisma.agendamento.findMany({ where, orderBy, include });
      return NextResponse.json(rows.map(toAg));
    }

    const [rows, total] = await Promise.all([
      prisma.agendamento.findMany({ where, orderBy, include, skip: pagination.skip, take: pagination.take }),
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

    // Grupos-alvo (item 1.7): a lista multi precede o campo legado.
    let targetGroups = [...new Set(body.grupoFormacaoIds ?? (body.grupoFormacaoId ? [body.grupoFormacaoId] : []))];
    if (user.role === "formador_comunitario") {
      // FC só agenda para a própria morada.
      if (targetGroups.some((g) => g !== user.grupoFormacaoId)) {
        return NextResponse.json({ error: "Sem permissão para criar agendamento em outra morada" }, { status: 403 });
      }
      if (targetGroups.length === 0 && user.grupoFormacaoId) targetGroups = [user.grupoFormacaoId];
    }
    // Todos os grupos-alvo devem pertencer à org.
    if (targetGroups.length > 0) {
      const validos = await prisma.grupoFormacao.count({
        where: { id: { in: targetGroups }, organizacaoId: user.organizacaoId },
      });
      if (validos !== targetGroups.length) {
        return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });
      }
    }
    // Sincroniza o campo legado: setado só quando exatamente 1 grupo.
    const grupoFormacaoIdCol = targetGroups.length === 1 ? targetGroups[0] : null;

    // Eventos avulsos (retiro/convocação/reunião/outro) não exigem Formação; usam
    // formacaoTema como título. "formacao" (default) valida a Formação escolhida.
    const tipoEvento = body.tipoEvento ?? "formacao";
    let formacaoIdFinal: string | null = null;
    if (tipoEvento === "formacao") {
      const formacao = await prisma.formacao.findFirst({
        where: { id: body.formacaoId ?? "", deletedAt: null, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
        select: { id: true },
      });
      if (!formacao) return NextResponse.json({ error: "Formação não encontrada" }, { status: 404 });
      formacaoIdFinal = formacao.id;
    }

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
        tipoEvento,
        formacaoId: formacaoIdFinal,
        formacaoTema: body.formacaoTema ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: body.tipoFormacao ?? "comunitaria",
        formadorId,
        formadorNome,
        grupoFormacaoId: grupoFormacaoIdCol,
        grupos: { create: targetGroups.map((gid) => ({ grupoFormacaoId: gid })) },
        dataInicio: new Date(body.dataInicio),
        dataFim: new Date(body.dataFim ?? body.dataInicio),
        local: body.local ?? null,
        linkOnline: body.linkOnline ?? null,
        status: body.status ?? "agendada",
        participantes: body.participantes ?? 0,
        observacoes: body.observacoes ?? null,
        googleCalendarEventId: body.googleCalendarEventId ?? null,
      },
      include: { grupos: { select: { grupoFormacaoId: true } } },
    });
    logAction("agendamento_created", user.id, getClientIp(request), { formacaoId: body.formacaoId }, user.organizacaoId);

    // Bell: notifica o FC de cada grupo-alvo (apenas se foi Admin/FG que agendou).
    if (targetGroups.length > 0 && user.role !== "formador_comunitario") {
      for (const gid of targetGroups) {
        formadorDoGrupo(gid).then((fcId) => {
          if (!fcId) return;
          criarNotificacao({
            organizacaoId: user.organizacaoId!,
            destinatarioId: fcId,
            tipo: "novo_agendamento",
            titulo: "Novo evento agendado para seu grupo",
            corpo: `${row.formacaoTema} — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
            linkAcao: "/agenda",
          });
        }).catch(() => {});
      }
    }

    // Notificação push — fire-and-forget
    sendPushToOrg(user.organizacaoId, {
      titulo: `Novo evento agendado`,
      corpo: `${row.formacaoTema} — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
      url: "/agenda",
    }).catch(() => {});

    // E-mail de criação aos formandos — só se o FG manteve o opt-in (item 1.6).
    // Fire-and-forget: não bloqueia a resposta 201.
    void notificarCriacaoPorEmail(row, targetGroups);

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
async function notificarCriacaoPorEmail(
  row: {
    id: string;
    organizacaoId: string;
    formacaoTema: string;
    dataInicio: Date;
    dataFim: Date;
    local: string | null;
    linkOnline: string | null;
  },
  grupos: string[]
): Promise<void> {
  try {
    const org = await prisma.organizacao.findUnique({
      where: { id: row.organizacaoId },
      select: { emailAgendamentoAtivo: true },
    });
    if (!org?.emailAgendamentoAtivo) return;

    const formandos = await formandosAlvo(row.organizacaoId, grupos);
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
