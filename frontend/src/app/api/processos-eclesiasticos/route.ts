import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { SessionUser } from "@/lib/auth-helpers";
import type { TipoProcessoEclesiastico } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tipoFiltro = searchParams.get("tipo") ?? undefined;
  const statusFiltro = searchParams.get("status") ?? undefined;
  const formandoId = searchParams.get("formandoId") ?? undefined;

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
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  if (user.role === "formador_comunitario") {
    return NextResponse.json({ error: "Sem permissão para criar processos eclesiásticos" }, { status: 403 });
  }

  const body = await req.json() as {
    formandoId: string;
    tipo: TipoProcessoEclesiastico;
    nivelFormativo: string;
    dadosFormulario?: Record<string, unknown>;
  };

  if (!body.formandoId || !body.tipo || !body.nivelFormativo) {
    return NextResponse.json({ error: "formandoId, tipo e nivelFormativo são obrigatórios" }, { status: 400 });
  }

  const formando = await prisma.formando.findFirst({
    where: { id: body.formandoId, organizacaoId: user.organizacaoId, deletedAt: null },
  });
  if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

  const processo = await prisma.processoEclesiastico.create({
    data: {
      organizacaoId: user.organizacaoId,
      formandoId: body.formandoId,
      tipo: body.tipo,
      nivelFormativo: body.nivelFormativo,
      status: "rascunho",
      dadosFormulario: body.dadosFormulario ?? {},
      criadoPorId: user.id,
    },
  });

  logAction(
    "processo_eclesiastico_criado",
    user.id,
    getClientIp(req),
    { processoId: processo.id, tipo: processo.tipo, formandoId: processo.formandoId },
    user.organizacaoId,
  );

  return NextResponse.json(processo, { status: 201 });
}
