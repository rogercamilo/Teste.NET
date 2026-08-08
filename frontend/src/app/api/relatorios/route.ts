import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
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
    const grupoFormacaoId = searchParams.get("grupoFormacaoId");

    if (!grupoFormacaoId) return NextResponse.json({ error: "grupoFormacaoId obrigatório" }, { status: 400 });

    // FC só pode acessar sua própria morada
    if (user.role === "formador_comunitario" && user.grupoFormacaoId !== grupoFormacaoId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Busca formandos ativos da morada para filtrar os relatórios
    const formandos = await prisma.formando.findMany({
      where: { grupoFormacaoId, organizacaoId: user.organizacaoId, ativo: true },
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
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { formandoId, nivelFormativo } = body;

    if (!formandoId || !nivelFormativo) {
      return NextResponse.json({ error: "formandoId e nivelFormativo são obrigatórios" }, { status: 400 });
    }

    // FC sem grupo não tem acesso a nenhum formando
    if (user.role === "formador_comunitario" && !user.grupoFormacaoId) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
    const grupoFormacaoFilter = user.role === "formador_comunitario"
      ? { grupoFormacaoId: user.grupoFormacaoId }
      : {};
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId: user.organizacaoId, deletedAt: null, ...grupoFormacaoFilter },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    // Pré-popula notas das 3 perspectivas a partir da última avaliação de cada perspectiva.
    // As 3 buscas são independentes → paralelizadas (R18: evita 3 round-trips sequenciais).
    const perspectivas = ["humana", "espiritual", "comunitaria"] as const;
    const eventos = await Promise.all(
      perspectivas.map((perspectiva) =>
        prisma.eventoFormando.findFirst({
          where: {
            formandoId,
            organizacaoId: user.organizacaoId,
            tipo: "avaliacao-adesao",
            perspectiva,
            notaAdesao: { not: null },
          },
          orderBy: { criadoEm: "desc" },
        })
      )
    );
    const notasSugeridas: Record<string, string | null> = {};
    perspectivas.forEach((perspectiva, i) => {
      notasSugeridas[perspectiva] = eventos[i]?.notaAdesao ?? null;
    });

    try {
      const row = await prisma.relatorioEtapa.create({
        data: {
          organizacaoId: user.organizacaoId,
          formandoId,
          formadorId: user.id,
          nivelFormativo,
          // Body values take precedence over pre-populated suggestions
          avaliacaoHumana: body.avaliacaoHumana !== undefined ? (body.avaliacaoHumana || null) : notasSugeridas.humana,
          avaliacaoEspiritual: body.avaliacaoEspiritual !== undefined ? (body.avaliacaoEspiritual || null) : notasSugeridas.espiritual,
          avaliacaoComunitaria: body.avaliacaoComunitaria !== undefined ? (body.avaliacaoComunitaria || null) : notasSugeridas.comunitaria,
          ...body.textoNarrativo !== undefined && { textoNarrativo: body.textoNarrativo || null },
          ...body.pontosForteza !== undefined && { pontosForteza: body.pontosForteza || null },
          ...body.desafios !== undefined && { desafios: body.desafios || null },
          ...body.recomendacao !== undefined && { recomendacao: body.recomendacao || null },
          ...body.textoRecomendacao !== undefined && { textoRecomendacao: body.textoRecomendacao || null },
        },
      });
      logAction("relatorio_created", user.id, getClientIp(request), { formandoId, nivelFormativo }, user.organizacaoId);
      return NextResponse.json(toRelatorio(row), { status: 201 });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return NextResponse.json({ error: "Relatório já existe para esta etapa" }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    logError("relatorios", err);
    return NextResponse.json({ error: "Falha ao criar relatório" }, { status: 500 });
  }
}
