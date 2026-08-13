import { NextResponse } from "next/server";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";
import { registrarRespostaPresencaPortal } from "@/lib/rsvp";

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

  // UPSERT: a linha de presença pode ainda não existir (o formando confirma antes
  // de o formador marcar). O escopo garante que só responde a evento em que está
  // envolvido. Fecha o ciclo push → portal → confirmação.
  const r = await registrarRespostaPresencaPortal({
    formandoId,
    organizacaoId,
    agendamentoId,
    resposta: "sim",
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ confirmacaoFormando: true });
}
