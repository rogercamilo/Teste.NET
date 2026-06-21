import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logError } from "@/lib/audit-log";
import { criarNotificacao } from "@/lib/notificacoes";
import { isValidId } from "@/lib/schemas";

type Params = { params: Promise<{ agendamentoId: string }> };

export async function POST(request: Request, { params }: Params) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");

  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em breve." },
      { status: 429 }
    );
  }

  const { agendamentoId } = await params;

  // C8 — valida formato do ID antes de usar no banco
  if (!isValidId(agendamentoId)) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const texto =
      typeof body?.justificativa === "string" ? body.justificativa.trim() : "";

    if (!texto || texto.length < 3 || texto.length > 500) {
      return NextResponse.json(
        { error: "Justificativa deve ter entre 3 e 500 caracteres." },
        { status: 400 }
      );
    }

    const presenca = await prisma.presencaFormacao.findFirst({
      where: { agendamentoId, formandoId, organizacaoId },
      include: {
        agendamento: { select: { formadorId: true, formacaoTema: true } },
      },
    });

    if (!presenca) {
      return NextResponse.json({ error: "Presença não encontrada" }, { status: 404 });
    }

    await prisma.presencaFormacao.update({
      where: { id: presenca.id },
      data: {
        confirmacaoFormando: false,
        justificativaFormando: texto,
      },
    });

    // C7 — fire-and-forget: falha na notificação não reverte a gravação
    const formadorId = presenca.agendamento?.formadorId;
    if (formadorId) {
      criarNotificacao({
        organizacaoId,
        destinatarioId: formadorId,
        tipo: "justificativa_formando",
        titulo: `${presenca.formandoNome} justificou ausência`,
        corpo: `"${texto.slice(0, 100)}${texto.length > 100 ? "…" : ""}"`,
        linkAcao: `/presenca?agendamento=${agendamentoId}`,
      }).catch((err) => logError("portal/justificar notificacao", err));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal/presenca/justificar POST", err);
    return NextResponse.json({ error: "Falha ao enviar justificativa" }, { status: 500 });
  }
}
