import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { SessionUser } from "@/lib/auth-helpers";
import type { TipoProcessoEclesiastico } from "@/types";
import { criarNotificacao, formadorDoGrupo } from "@/lib/notificacoes";
import { camposCanonicosFaltando } from "@/lib/jornada-vocacional";

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role === "formador_comunitario") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const tipoFiltro = searchParams.get("tipo") ?? undefined;
  const statusFiltro = searchParams.get("status") ?? undefined;
  const formandoId = searchParams.get("formandoId") ?? undefined;

  try {
    const processos = await prisma.processoEclesiastico.findMany({
      where: {
        organizacaoId: user.organizacaoId,
        ...(tipoFiltro ? { tipo: tipoFiltro as TipoProcessoEclesiastico } : {}),
        ...(statusFiltro ? { status: statusFiltro as never } : {}),
        ...(formandoId ? { formandoId } : {}),
      },
      include: {
        formando: { select: { id: true, nome: true } },
        criadoPor: { select: { id: true, nome: true } },
        documentos: true,
      },
      orderBy: { criadoEm: "desc" },
    });

    const result = processos.map((p) => ({
      id: p.id,
      organizacaoId: p.organizacaoId,
      formandoId: p.formandoId,
      formandoNome: p.formando.nome,
      tipo: p.tipo,
      nivelFormativo: p.nivelFormativo,
      status: p.status,
      dadosFormulario: p.dadosFormulario,
      favoravelRenovacao: p.favoravelRenovacao,
      numeroRenovacao: p.numeroRenovacao,
      criadoPorId: p.criadoPorId,
      criadoPorNome: p.criadoPor.nome,
      criadoEm: p.criadoEm.toISOString(),
      atualizadoEm: p.atualizadoEm.toISOString(),
      documentos: p.documentos.map((d) => ({
        id: d.id,
        processoId: d.processoId,
        tipo: d.tipo,
        status: d.status,
        versao: d.versao,
        arquivoId: d.arquivoId,
        geradoEm: d.geradoEm?.toISOString() ?? null,
        criadoEm: d.criadoEm.toISOString(),
      })),
    }));

    return NextResponse.json(result);
  } catch (err) {
    logError("processos-eclesiasticos GET", err);
    return NextResponse.json({ error: "Falha ao carregar processos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  if (user.role === "formador_comunitario") {
    return NextResponse.json({ error: "Sem permissão para criar processos eclesiásticos" }, { status: 403 });
  }

  const { id: userId, organizacaoId } = user;

  try {
    const body = await req.json().catch(() => ({})) as {
      formandoId: string;
      tipo: TipoProcessoEclesiastico;
      nivelFormativo: string;
      dadosFormulario?: Record<string, unknown>;
    };

    if (!body.formandoId || !body.tipo || !body.nivelFormativo) {
      return NextResponse.json({ error: "formandoId, tipo e nivelFormativo são obrigatórios" }, { status: 400 });
    }

    const formando = await prisma.formando.findFirst({
      where: { id: body.formandoId, organizacaoId, deletedAt: null },
      select: {
        id: true, nome: true, grupoFormacaoId: true,
        rg: true, orgaoEmissor: true, nacionalidade: true, cep: true, paroquiaReferencia: true,
      },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const processo = await prisma.processoEclesiastico.create({
      data: {
        organizacaoId,
        formandoId: body.formandoId,
        tipo: body.tipo,
        nivelFormativo: body.nivelFormativo,
        status: "rascunho",
        dadosFormulario: (body.dadosFormulario ?? {}) as import("@prisma/client").Prisma.InputJsonValue,
        criadoPorId: userId,
      },
    });

    logAction(
      "processo_eclesiastico_criado",
      userId,
      getClientIp(req),
      { processoId: processo.id, tipo: processo.tipo, formandoId: processo.formandoId },
      organizacaoId,
    );

    // Notifica FC se formando tem campos canônicos faltando
    const faltando = camposCanonicosFaltando(formando);
    if (faltando.length > 0 && formando.grupoFormacaoId) {
      formadorDoGrupo(formando.grupoFormacaoId).then((fcId) => {
        if (!fcId) return;
        criarNotificacao({
          organizacaoId,
          destinatarioId: fcId,
          tipo: "dados_formando_pendentes",
          titulo: `Dados incompletos de ${formando.nome}`,
          corpo: `Para gerar os documentos do processo, complete: ${faltando.join(", ")}.`,
          linkAcao: `/formandos/${formando.id}`,
        });
      }).catch(() => {});
    }

    return NextResponse.json(processo, { status: 201 });
  } catch (err) {
    logError("processos-eclesiasticos", err);
    return NextResponse.json({ error: "Falha ao criar processo" }, { status: 500 });
  }
}
