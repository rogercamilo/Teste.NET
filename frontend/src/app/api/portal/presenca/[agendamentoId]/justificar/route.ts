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

  const body = await request.json().catch(() => ({}));
  const justificativa =
    typeof body?.justificativa === "string" ? body.justificativa.trim() : "";

  // UPSERT: a linha de presença pode ainda não existir. A validação do motivo
  // (3–500) e a notificação ao formador ficam no núcleo compartilhado (rsvp).
  const r = await registrarRespostaPresencaPortal({
    formandoId,
    organizacaoId,
    agendamentoId,
    resposta: "nao",
    justificativa,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
