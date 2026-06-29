import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { canAddFormando, notifyAvancadoLimitIfNeeded } from "@/lib/plan-limits";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateFormandoSchema, parseJson } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import type { Formando, ProgressoEtapa } from "@/types";

import { SessionUser as SU } from "@/lib/auth-helpers";
import { criarNotificacao, formadorDoGrupo } from "@/lib/notificacoes";
import { sendPushInviteEmail } from "@/lib/email";
import { toFormando } from "@/lib/converters";
import crypto from "crypto";

// Safety cap for non-paginated requests — prevents runaway queries on large datasets.
// Clients using the data-store always load all records; this protects server memory.
// The pagination path (parsePagination) is unaffected.
const UNBOUNDED_CAP = 1000;

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const grupoFormacaoId = searchParams.get("grupoFormacaoId");
    const where: Record<string, unknown> = { organizacaoId: user.organizacaoId, deletedAt: null };

    if (user.role === "formador_comunitario") {
      where.grupoFormacaoId = user.grupoFormacaoId ?? null;
    } else if (grupoFormacaoId) {
      where.grupoFormacaoId = grupoFormacaoId;
    }

    const pagination = parsePagination(searchParams);
    const findManyArgs = {
      where,
      omit: { foto: true as const },
      include: { progressoEtapas: true, grupoFormacao: { select: { gradeId: true } } },
      orderBy: { nome: "asc" as const },
    };

    const [rows, total] = pagination
      ? await Promise.all([
          prisma.formando.findMany({ ...findManyArgs, skip: pagination.skip, take: pagination.take }),
          prisma.formando.count({ where }),
        ])
      : [await prisma.formando.findMany({ ...findManyArgs, take: UNBOUNDED_CAP }), null];

    const gradeIds = [...new Set(
      rows.map((r) => r.grupoFormacao?.gradeId).filter((id): id is string => !!id)
    )];
    const gradeMap = new Map<string, number>();
    if (gradeIds.length > 0) {
      const grades = await prisma.gradeFormativa.findMany({
        where: { id: { in: gradeIds } },
        select: { id: true, totalFormacoes: true },
      });
      for (const g of grades) gradeMap.set(g.id, g.totalFormacoes);
    }

    // Only query formacao counts for rows that don't have a grade-based total
    const niveisWithoutGrade = [...new Set(
      rows
        .filter((r) => !r.grupoFormacao?.gradeId || !gradeMap.has(r.grupoFormacao.gradeId))
        .map((r) => r.nivelFormativo)
    )];
    const countByNivel = new Map<string, number>();
    if (niveisWithoutGrade.length > 0) {
      const formacoesAgg = await prisma.formacao.groupBy({
        by: ["nivelFormativo"],
        where: {
          nivelFormativo: { in: niveisWithoutGrade },
          OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }],
          deletedAt: null,
        },
        _count: { id: true },
      });
      for (const c of formacoesAgg) countByNivel.set(c.nivelFormativo, c._count.id);
    }

    const data = rows.map((r) => {
      const { grupoFormacao, ...rest } = r;
      const gradeTotal = grupoFormacao?.gradeId ? gradeMap.get(grupoFormacao.gradeId) : undefined;
      const nivelTotal = countByNivel.get(r.nivelFormativo);
      const totalFormacoes = (gradeTotal ?? nivelTotal) || rest.totalFormacoes;
      return toFormando({ ...rest, totalFormacoes });
    });

    if (pagination && total !== null) {
      return NextResponse.json(data, { headers: paginationHeaders(total, pagination) });
    }
    return NextResponse.json(data);
  } catch (err) {
    logError("formandos GET", err);
    return NextResponse.json({ error: "Falha ao carregar formandos" }, { status: 500 });
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
    const parsed = await parseJson(request, CreateFormandoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const limitCheck = await canAddFormando(user.organizacaoId!);
    if (!limitCheck.allowed) {
      notifyAvancadoLimitIfNeeded(user.organizacaoId!, "usuarios");
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

    if (user.role === "formador_comunitario" && body.grupoFormacaoId && body.grupoFormacaoId !== user.grupoFormacaoId) {
      return NextResponse.json({ error: "Sem permissão para criar formandos em outra morada" }, { status: 403 });
    }

    const tokenAssinatura = crypto.randomBytes(32).toString("hex");

    const row = await prisma.formando.create({
      data: {
        organizacaoId: user.organizacaoId,
        nome: body.nome,
        dataNascimento: new Date(body.dataNascimento),
        estadoCivil: body.estadoCivil ?? "solteiro",
        modalidade: body.modalidade ?? "presencial",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        dataIngresso: new Date(body.dataIngresso ?? Date.now()),
        telefone: body.telefone ?? "",
        email: body.email ?? "",
        ativo: body.ativo ?? true,
        motivoInatividade: body.motivoInatividade ?? null,
        foto: body.foto ?? null,
        turmaId: body.turmaId ?? null,
        grupoFormacaoId: body.grupoFormacaoId ?? null,
        tokenAssinatura,
        totalFormacoes: body.totalFormacoes ?? 0,
        formacoesRealizadas: body.formacoesRealizadas ?? 0,
        progressoEtapas: {
          create: (body.progressoEtapas ?? []).map((p) => ({
            nivelFormativo: p.nivel,
            formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas ?? 0,
            retirosComunitariosRealizados: p.retirosComunitariosRealizados ?? 0,
            retirosPessoaisRealizados: p.retirosPessoaisRealizados ?? 0,
            iniciouEm: p.iniciouEm ? new Date(p.iniciouEm) : null,
            concluiuEm: p.concluiuEm ? new Date(p.concluiuEm) : null,
          })),
        },
      },
      include: { progressoEtapas: true, grupoFormacao: { select: { nome: true } } },
    });
    logAction("formando_created", user.id, getClientIp(request), { nome: body.nome }, user.organizacaoId);

    // Envia e-mail de ativação de notificações (fire-and-forget) se formando tem e-mail
    if (body.email) {
      const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      sendPushInviteEmail({
        organizacaoId: user.organizacaoId,
        nome: row.nome,
        email: row.email,
        grupoNome: row.grupoFormacao?.nome ?? null,
        ativarUrl: `${appUrl}/ativar-notificacoes/${tokenAssinatura}`,
      }).catch(() => {});
    }

    // Notifica FC do grupo (apenas se não foi o próprio FC que adicionou)
    if (row.grupoFormacaoId && user.role !== "formador_comunitario") {
      formadorDoGrupo(row.grupoFormacaoId).then((fcId) => {
        if (!fcId) return;
        criarNotificacao({
          organizacaoId: user.organizacaoId!,
          destinatarioId: fcId,
          tipo: "novo_formando",
          titulo: "Novo formando adicionado ao seu grupo",
          corpo: `${row.nome} foi adicionado(a) ao seu grupo de formação.`,
          linkAcao: `/formandos/${row.id}`,
        });
      }).catch(() => {});
    }

    const { grupoFormacao: _gf, ...rowData } = row;
    return NextResponse.json(toFormando(rowData), { status: 201 });
  } catch (err) {
    logError("formandos POST", err);
    return NextResponse.json({ error: "Falha ao criar formando" }, { status: 500 });
  }
}
