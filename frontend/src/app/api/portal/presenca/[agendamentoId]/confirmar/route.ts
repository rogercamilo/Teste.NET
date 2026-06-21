import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logError } from "@/lib/audit-log";
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
    const presenca = await prisma.presencaFormacao.findFirst({
      where: { agendamentoId, formandoId, organizacaoId },
    });

    if (!presenca) {
      return NextResponse.json({ error: "Presença não encontrada" }, { status: 404 });
    }

    const updated = await prisma.presencaFormacao.update({
      where: { id: presenca.id },
      data: { confirmacaoFormando: true },
    });

    return NextResponse.json({ confirmacaoFormando: updated.confirmacaoFormando });
  } catch (err) {
    logError("portal/presenca/confirmar POST", err);
    return NextResponse.json({ error: "Falha ao confirmar presença" }, { status: 500 });
  }
}
