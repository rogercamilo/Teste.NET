import { NextResponse } from "next/server";
import { logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import {
  listarNaoLidasFormando,
  marcarTodasLidasFormando,
} from "@/lib/notificacoes";

/**
 * Notificações in-app do FORMANDO (histórico durável no Portal). A identidade vem
 * dos headers injetados pelo proxy após verificar o `portal_session` (não
 * spoofáveis) — mesmo padrão das demais rotas de portal. Tudo escopado ao par
 * (formandoId, organizacaoId): um formando nunca lê/marca aviso de outro.
 */
export async function GET(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const notificacoes = await listarNaoLidasFormando(formandoId, organizacaoId);
    return NextResponse.json(notificacoes);
  } catch (err) {
    logError("portal notificacoes GET", err);
    return NextResponse.json({ error: "Falha ao listar notificações" }, { status: 500 });
  }
}

// PATCH sem corpo → marca todas as notificações do formando como lidas.
export async function PATCH(request: Request) {
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
    await marcarTodasLidasFormando(formandoId, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal notificacoes PATCH all", err);
    return NextResponse.json({ error: "Falha ao atualizar notificações" }, { status: 500 });
  }
}
