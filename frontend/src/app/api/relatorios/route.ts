import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { toRelatorio } from "@/lib/converters";
import type { SessionUser as SU } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const moradaId = searchParams.get("moradaId");

    if (!moradaId) return NextResponse.json({ error: "moradaId obrigatório" }, { status: 400 });

    // FC só pode acessar sua própria morada
    if (user.role === "formador_comunitario" && user.moradaId !== moradaId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Busca formandos ativos da morada para filtrar os relatórios
    const formandos = await prisma.formando.findMany({
      where: { moradaId, organizacaoId: user.organizacaoId, ativo: true },
      select: { id: true },
    });
    const formandoIds = formandos.map((f) => f.id);

    const rows = await prisma.relatorioEtapa.findMany({
      where: { organizacaoId: user.organizacaoId, formandoId: { in: formandoIds } },
      orderBy: { atualizadoEm: "desc" },
    });

    return NextResponse.json(rows.map(toRelatorio));
  } catch (err) {
    logError("relatorios", err);
    return NextResponse.json({ error: "Falha ao carregar relatórios" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id!);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { formandoId, nivelFormativo } = body;

    if (!formandoId || !nivelFormativo) {
      return NextResponse.json({ error: "formandoId e nivelFormativo são obrigatórios" }, { status: 400 });
    }

    // Verifica acesso ao formando
    const moradaFilter = user.role === "formador_comunitario" ? { moradaId: user.moradaId ?? null } : {};
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId: user.organizacaoId, ...moradaFilter },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    // Verifica se já existe
    const existente = await prisma.relatorioEtapa.findUnique({
      where: { formandoId_nivelFormativo: { formandoId, nivelFormativo } },
    });
    if (existente) return NextResponse.json({ error: "Relatório já existe para esta etapa" }, { status: 409 });

    // Pré-popula notas das 3 perspectivas a partir da última avaliação de cada perspectiva
    const perspectivas = ["humana", "espiritual", "comunitaria"] as const;
    const notasSugeridas: Record<string, string | null> = {};
    for (const perspectiva of perspectivas) {
      const evento = await prisma.eventoFormando.findFirst({
        where: {
          formandoId,
          organizacaoId: user.organizacaoId,
          tipo: "avaliacao-adesao",
          perspectiva,
          notaAdesao: { not: null },
        },
        orderBy: { criadoEm: "desc" },
      });
      notasSugeridas[perspectiva] = evento?.notaAdesao ?? null;
    }

    const row = await prisma.relatorioEtapa.create({
      data: {
        organizacaoId: user.organizacaoId,
        formandoId,
        formadorId: user.id!,
        nivelFormativo,
        avaliacaoHumana: notasSugeridas.humana,
        avaliacaoEspiritual: notasSugeridas.espiritual,
        avaliacaoComunitaria: notasSugeridas.comunitaria,
        ...body.textoNarrativo !== undefined && { textoNarrativo: body.textoNarrativo },
        ...body.pontosForteza !== undefined && { pontosForteza: body.pontosForteza },
        ...body.desafios !== undefined && { desafios: body.desafios },
        ...body.recomendacao !== undefined && { recomendacao: body.recomendacao },
        ...body.textoRecomendacao !== undefined && { textoRecomendacao: body.textoRecomendacao },
      },
    });

    logAction("relatorio_created", user.id, getClientIp(request), { formandoId, nivelFormativo }, user.organizacaoId);
    return NextResponse.json(toRelatorio(row), { status: 201 });
  } catch (err) {
    logError("relatorios", err);
    return NextResponse.json({ error: "Falha ao criar relatório" }, { status: 500 });
  }
}
