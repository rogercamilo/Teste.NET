import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logError } from "@/lib/audit-log";

const STATUS_ATIVOS = ["ativa", "aguardando_carta", "em_discernimento"] as const;

export async function POST(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { mensagem?: unknown };
    const mensagem = typeof body.mensagem === "string" ? body.mensagem.slice(0, 1000).trim() : undefined;

    const participacao = await prisma.participacaoVocacional.findFirst({
      where: { formandoId, organizacaoId, status: { in: [...STATUS_ATIVOS] } },
      orderBy: { criadoEm: "desc" },
      include: { turma: { select: { vocacionalAcompanhamentoAtivo: true } } },
    });
    if (!participacao) {
      return NextResponse.json({ error: "Nenhuma participação vocacional em andamento" }, { status: 404 });
    }
    if (!participacao.turma.vocacionalAcompanhamentoAtivo) {
      return NextResponse.json({ error: "Esta turma não oferece acompanhamento individual" }, { status: 403 });
    }

    // Evita solicitações duplicadas: se já há uma pendente, retorna a existente.
    const pendente = await prisma.solicitacaoAcompanhamento.findFirst({
      where: { participacaoId: participacao.id, status: "pendente" },
      select: { id: true },
    });
    if (pendente) return NextResponse.json({ ok: true, jaPendente: true });

    await prisma.solicitacaoAcompanhamento.create({
      data: { participacaoId: participacao.id, mensagem, status: "pendente" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal solicitar-acompanhamento POST", err);
    return NextResponse.json({ error: "Falha ao solicitar acompanhamento" }, { status: 500 });
  }
}
