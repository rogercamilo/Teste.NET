import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { toRelatorio } from "@/lib/converters";
import type { SessionUser as SU } from "@/lib/auth-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;
    const row = await prisma.relatorioEtapa.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toRelatorio(row));
  } catch (err) {
    logError("relatorios", err);
    return NextResponse.json({ error: "Falha ao carregar relatório" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const { id } = await params;
    const row = await prisma.relatorioEtapa.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    if (row.status === "finalizado") {
      return NextResponse.json({ error: "Relatório finalizado não pode ser editado" }, { status: 400 });
    }

    // FC só pode editar relatórios que ele mesmo criou
    if (user.role === "formador_comunitario" && row.formadorId !== user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const updated = await prisma.relatorioEtapa.update({
      where: { id },
      data: {
        ...body.avaliacaoHumana !== undefined && { avaliacaoHumana: body.avaliacaoHumana || null },
        ...body.avaliacaoEspiritual !== undefined && { avaliacaoEspiritual: body.avaliacaoEspiritual || null },
        ...body.avaliacaoComunitaria !== undefined && { avaliacaoComunitaria: body.avaliacaoComunitaria || null },
        ...body.textoNarrativo !== undefined && { textoNarrativo: body.textoNarrativo || null },
        ...body.pontosForteza !== undefined && { pontosForteza: body.pontosForteza || null },
        ...body.desafios !== undefined && { desafios: body.desafios || null },
        ...body.recomendacao !== undefined && { recomendacao: body.recomendacao || null },
        ...body.textoRecomendacao !== undefined && { textoRecomendacao: body.textoRecomendacao || null },
      },
    });

    logAction("relatorio_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toRelatorio(updated));
  } catch (err) {
    logError("relatorios", err);
    return NextResponse.json({ error: "Falha ao atualizar relatório" }, { status: 500 });
  }
}
