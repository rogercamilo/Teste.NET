import { NextResponse } from "next/server";
import { registrarRsvpPorToken, type RsvpResposta } from "@/lib/rsvp";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Link inválido" }, { status: 404 });

  // Rate-limit por token — protege o endpoint público de abuso.
  const rl = await limiters.mutation(`rsvp:${token}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em breve." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const agendamentoId = typeof body?.agendamentoId === "string" ? body.agendamentoId : "";
  const resposta = body?.resposta as RsvpResposta;
  const justificativa = typeof body?.justificativa === "string" ? body.justificativa : undefined;

  if (!isValidId(agendamentoId)) {
    return NextResponse.json({ error: "Encontro não encontrado" }, { status: 404 });
  }

  const result = await registrarRsvpPorToken({ token, agendamentoId, resposta, justificativa });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({
    ok: true,
    resposta: result.resposta,
    formandoNome: result.formandoNome,
    agendamentoTema: result.agendamentoTema,
  });
}
