import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logError } from "@/lib/audit-log";

/**
 * Pedido de acompanhamento pelo FORMANDO (Portal do Formando). Identidade vem dos
 * headers injetados pelo proxy após verificar o portal_session (não spoofáveis).
 * Sempre disponível ao formando — não depende de flag do formador. Evita pedidos
 * duplicados: se já há um pendente, retorna o existente.
 */
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

    const pendente = await prisma.solicitacaoAcompanhamentoFormando.findFirst({
      where: { formandoId, organizacaoId, status: "pendente" },
      select: { id: true },
    });
    if (pendente) return NextResponse.json({ ok: true, jaPendente: true });

    await prisma.solicitacaoAcompanhamentoFormando.create({
      data: { formandoId, organizacaoId, mensagem, status: "pendente" },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal acompanhamento/solicitar POST", err);
    return NextResponse.json({ error: "Falha ao solicitar acompanhamento" }, { status: 500 });
  }
}

/**
 * Desmarca (revoga) o pedido de acompanhamento do próprio formando. Remove
 * durablemente a solicitação pendente, escopada à identidade do portal (headers
 * do proxy, não spoofáveis) — anti-IDOR. Idempotente: se não há pendência, ainda
 * responde ok (a intenção "não quero mais" vale). Só afeta pedidos `pendente`;
 * pedidos já `agendada`/`recusada` pelo formador ficam intactos (histórico).
 */
export async function DELETE(request: Request) {
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
    await prisma.solicitacaoAcompanhamentoFormando.deleteMany({
      where: { formandoId, organizacaoId, status: "pendente" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal acompanhamento/solicitar DELETE", err);
    return NextResponse.json({ error: "Falha ao cancelar solicitação" }, { status: 500 });
  }
}
