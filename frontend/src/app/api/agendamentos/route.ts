import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateAgendamentoSchema, parseJson } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import { sendPushToOrg, sendPushToGroup, sendPushToFormando } from "@/lib/push";
import { formatDataBr } from "@/lib/utils";
import {
  criarNotificacao,
  formadorDoGrupo,
  criarNotificacaoFormando,
  criarNotificacaoParaFormandosDoEscopo,
} from "@/lib/notificacoes";
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
    const me = user.id ?? "";
    // Escopo de papel para eventos COLETIVOS (não-acompanhamento).
    const roleScope: Record<string, unknown> = {};
    if (user.role === "formador_comunitario") {
      const gid = user.grupoFormacaoId ?? null;
      // Vê os agendamentos do próprio grupo — legado (grupoFormacaoId) OU via
      // junção multi-grupo (item 1.7). Sem grupo, mantém o escopo org-wide legado.
      if (gid) {
        roleScope.OR = [
          { grupoFormacaoId: gid },
          { grupos: { some: { grupoFormacaoId: gid } } },
          // Eventos gerais da org (Convocação/Assembleia Geral) alcançam todo grupo.
          { tipoEvento: { in: ["convocacao", "reuniao"] } },
        ];
      } else {
        roleScope.grupoFormacaoId = null;
      }
    }
    // Acompanhamento Comunitário é privado: visível só ao criador ou ao alvo,
    // nunca no pool org-wide (nem para admin/pedagógico).
    const where: Record<string, unknown> = {
      organizacaoId: user.organizacaoId,
      deletedAt: null,
      OR: [
        { tipoEvento: { not: "acompanhamento_comunitario" }, ...roleScope },
        {
          tipoEvento: "acompanhamento_comunitario",
          OR: [{ formadorId: me }, { acompanhadoUsuarioId: me }],
        },
      ],
    };
    const orderBy = { dataInicio: "asc" as const };
    const include = {
      grupos: { select: { grupoFormacaoId: true } },
      acompanhadoFormando: { select: { nome: true } },
      acompanhadoUsuario: { select: { nome: true } },
    } as const;

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

    // Acompanhamento Comunitário (encontro 1:1) tem regras próprias — alvo por
    // papel, teto de 1×/mês por pessoa e visibilidade restrita — então segue uma
    // trilha dedicada em vez da lógica de evento coletivo abaixo.
    if (body.tipoEvento === "acompanhamento_comunitario") {
      return criarAcompanhamentoComunitario(user, body, request);
    }

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

    // Convocação Geral e Reunião/Assembleia Geral são eventos org-wide (toda a
    // org, todos os níveis) — só FG e Admin podem agendá-los.
    if (
      (tipoEvento === "convocacao" || tipoEvento === "reuniao") &&
      user.role !== "formador_geral" &&
      user.role !== "administrador"
    ) {
      return NextResponse.json(
        { error: "Sem permissão para agendar evento geral da organização" },
        { status: 403 }
      );
    }

    // Formação Complementar é exclusiva de FG e FC (formadores de campo) — espelha
    // a trava da UI no servidor, como em Convocação/Assembleia e Acompanhamento.
    if (
      tipoEvento === "formacao_complementar" &&
      user.role !== "formador_geral" &&
      user.role !== "formador_comunitario"
    ) {
      return NextResponse.json(
        { error: "Sem permissão para agendar Formação Complementar" },
        { status: 403 }
      );
    }
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
        diaInteiro: body.diaInteiro ?? false,
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

    // Web push aos FORMANDOS envolvidos — lembrete quente do agendamento que
    // eles também veem no portal (por isso `url: "/portal"` e `formandosOnly`; o
    // staff é avisado por bell, não por este push). Respeita o escopo do evento:
    // Convocação/Assembleia Geral alcançam TODA a org; os demais vão aos
    // grupos-alvo (ou toda a org quando nenhum grupo foi selecionado = "todos os
    // grupos"). Espelha o alvo do e-mail de criação. Fire-and-forget.
    const pushPayload = {
      titulo: "Novo evento agendado",
      corpo: `${row.formacaoTema} — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
      url: "/portal",
    };
    const escopoOrg = tipoEvento === "convocacao" || tipoEvento === "reuniao" || targetGroups.length === 0;
    if (escopoOrg) {
      sendPushToOrg(user.organizacaoId, pushPayload, { formandosOnly: true }).catch(() => {});
    } else {
      for (const gid of targetGroups) {
        sendPushToGroup(user.organizacaoId, gid, pushPayload, { formandosOnly: true }).catch(() => {});
      }
    }

    // Histórico in-app durável do formando (o push é efêmero). Mesmo escopo do push.
    void criarNotificacaoParaFormandosDoEscopo({
      organizacaoId: user.organizacaoId,
      grupoFormacaoIds: escopoOrg ? [] : targetGroups,
      tipo: "encontro_agendado",
      titulo: `Novo encontro: ${row.formacaoTema}`,
      corpo: `${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
    });

    // E-mail de criação aos formandos — só se o FG manteve o opt-in (item 1.6).
    // Fire-and-forget: não bloqueia a resposta 201.
    void notificarCriacaoPorEmail(row, targetGroups);

    return NextResponse.json(toAg(row), { status: 201 });
  } catch (err) {
    logError("agendamentos POST", err);
    return NextResponse.json({ error: "Falha ao criar agendamento" }, { status: 500 });
  }
}

/** Payload mínimo do Acompanhamento Comunitário (subconjunto de CreateAgendamentoSchema). */
type AcompanhamentoBody = {
  acompanhadoFormandoId?: string | null;
  acompanhadoUsuarioId?: string | null;
  dataInicio: string;
  dataFim?: string;
  local?: string | null;
  observacoes?: string | null;
  status?: string;
};

/**
 * Cria um Acompanhamento Comunitário (evento 1:1 de partilha e oração).
 *
 * - Fluxo FC → formando do próprio grupo (`acompanhadoFormandoId`).
 * - Fluxo FG → usuário formador comunitário/pedagógico do tenant (`acompanhadoUsuarioId`).
 *
 * Regras: só FC/FG criam; o alvo é validado contra o escopo do criador; no máximo
 * um por pessoa acompanhada por mês-calendário. Não usa grupos-alvo (é privado):
 * a visibilidade deriva de `formadorId` (criador) e do alvo, não do grupo.
 */
async function criarAcompanhamentoComunitario(
  user: SU,
  body: AcompanhamentoBody,
  request: Request
): Promise<NextResponse> {
  if (!user.id || !user.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (user.role !== "formador_comunitario" && user.role !== "formador_geral") {
    return NextResponse.json(
      { error: "Sem permissão para agendar acompanhamento comunitário" },
      { status: 403 }
    );
  }

  const organizacaoId = user.organizacaoId;
  let acompanhadoFormandoId: string | null = null;
  let acompanhadoUsuarioId: string | null = null;
  let nomeAlvo = "";
  let nivelAlvo = "pre-discipulado";

  if (user.role === "formador_comunitario") {
    // FC só acompanha formandos da própria morada.
    if (!body.acompanhadoFormandoId) {
      return NextResponse.json({ error: "Selecione o formando a acompanhar" }, { status: 400 });
    }
    const formando = await prisma.formando.findFirst({
      where: {
        id: body.acompanhadoFormandoId,
        organizacaoId,
        grupoFormacaoId: user.grupoFormacaoId ?? "__sem_grupo__",
        deletedAt: null,
      },
      select: { id: true, nome: true, nivelFormativo: true },
    });
    if (!formando) {
      return NextResponse.json({ error: "Formando não está sob o seu cuidado" }, { status: 403 });
    }
    acompanhadoFormandoId = formando.id;
    nomeAlvo = formando.nome;
    nivelAlvo = formando.nivelFormativo;
  } else {
    // FG acompanha formadores comunitários e pedagógicos do tenant.
    if (!body.acompanhadoUsuarioId) {
      return NextResponse.json({ error: "Selecione o formador a acompanhar" }, { status: 400 });
    }
    const alvo = await prisma.usuario.findFirst({
      where: {
        id: body.acompanhadoUsuarioId,
        organizacaoId,
        // Formadores de CAMPO acompanháveis pelo FG: comunitário e (quando vier a
        // existir como perfil persistido) pedagógico — nunca gestão/plataforma.
        perfil: { notIn: ["administrador", "formador_geral", "super_admin"] },
      },
      select: { id: true, nome: true },
    });
    if (!alvo) {
      return NextResponse.json({ error: "Formador inválido para acompanhamento" }, { status: 400 });
    }
    acompanhadoUsuarioId = alvo.id;
    nomeAlvo = alvo.nome;
  }

  // Teto de 1×/mês POR pessoa acompanhada (mês-calendário da data escolhida).
  const inicio = new Date(body.dataInicio);
  const mesInicio = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const mesFim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
  const jaAgendado = await prisma.agendamento.findFirst({
    where: {
      organizacaoId,
      tipoEvento: "acompanhamento_comunitario",
      status: { not: "cancelada" },
      deletedAt: null,
      dataInicio: { gte: mesInicio, lt: mesFim },
      ...(acompanhadoFormandoId ? { acompanhadoFormandoId } : { acompanhadoUsuarioId }),
    },
    select: { id: true },
  });
  if (jaAgendado) {
    return NextResponse.json(
      { error: `Já existe um Acompanhamento Comunitário para ${nomeAlvo} neste mês.` },
      { status: 409 }
    );
  }

  const criador = await prisma.usuario.findUnique({
    where: { id: user.id },
    select: { nome: true },
  });

  const row = await prisma.agendamento.create({
    data: {
      organizacaoId,
      tipoEvento: "acompanhamento_comunitario",
      formacaoId: null,
      formacaoTema: `Acompanhamento • ${nomeAlvo}`,
      nivelFormativo: nivelAlvo,
      tipoFormacao: "comunitaria",
      formadorId: user.id,
      formadorNome: criador?.nome ?? "",
      grupoFormacaoId: null,
      acompanhadoFormandoId,
      acompanhadoUsuarioId,
      dataInicio: inicio,
      dataFim: new Date(body.dataFim ?? body.dataInicio),
      local: body.local ?? null,
      status: (body.status as string | undefined) ?? "agendada",
      observacoes: body.observacoes ?? null,
    },
    include: {
      acompanhadoFormando: { select: { nome: true } },
      acompanhadoUsuario: { select: { nome: true } },
    },
  });
  logAction(
    "agendamento_created",
    user.id,
    getClientIp(request),
    { tipoEvento: "acompanhamento_comunitario", acompanhadoFormandoId, acompanhadoUsuarioId },
    organizacaoId
  );

  // Fluxo FG: avisa o formador acompanhado (bell). Fluxo FC: o formando vê pelo
  // Portal do Formando; formandos não são Usuario, então não há bell.
  if (acompanhadoUsuarioId) {
    criarNotificacao({
      organizacaoId,
      destinatarioId: acompanhadoUsuarioId,
      tipo: "novo_agendamento",
      titulo: "Acompanhamento comunitário agendado",
      corpo: `${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`,
      linkAcao: "/agenda",
    }).catch(() => {});
  }

  // Fluxo FC→formando: web push ao formando acompanhado (1:1). Corpo neutro —
  // não vaza a nota privada do encontro; leva ao Portal do Formando.
  if (acompanhadoFormandoId) {
    const corpoAcomp = `Seu formador agendou um acompanhamento com você — ${formatDataBr(row.dataInicio)}${row.local ? ` · ${row.local}` : ""}`;
    sendPushToFormando(organizacaoId, acompanhadoFormandoId, {
      titulo: "Novo acompanhamento agendado",
      corpo: corpoAcomp,
      url: "/portal",
    }).catch(() => {});
    // Histórico in-app durável (corpo neutro — não vaza a nota privada).
    void criarNotificacaoFormando({
      organizacaoId,
      formandoId: acompanhadoFormandoId,
      tipo: "encontro_agendado",
      titulo: "Novo acompanhamento agendado",
      corpo: corpoAcomp,
    });
  }

  return NextResponse.json(toAg(row), { status: 201 });
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
    diaInteiro: boolean;
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
          diaInteiro: row.diaInteiro,
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
