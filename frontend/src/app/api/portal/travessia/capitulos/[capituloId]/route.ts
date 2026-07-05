import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { FRUTOS_POR_ACAO } from "@/types";

type Params = { params: Promise<{ capituloId: string }> };

/**
 * Autoriza a operação e resolve o capítulo: o portal injeta o formando via
 * headers (proxy). A pertença é o gate anti-IDOR — o capítulo precisa pertencer
 * a um livro ATIVO da MESMA turma vocacional em que o formando está vinculado.
 * Um `capituloId` de outra turma/organização não resolve → 404.
 */
async function resolve(capituloId: string, formandoId: string, organizacaoId: string) {
  const formando = await prisma.formando.findFirst({
    where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
    select: { grupoFormacaoId: true },
  });
  if (!formando?.grupoFormacaoId) return null;

  const capitulo = await prisma.capituloLeitura.findFirst({
    where: {
      id: capituloId,
      leitura: { organizacaoId, turmaId: formando.grupoFormacaoId, ativo: true },
    },
    select: { id: true, leituraId: true },
  });
  return capitulo;
}

export async function POST(request: Request, { params }: Params) {
  const { capituloId } = await params;
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
    const capitulo = await resolve(capituloId, formandoId, organizacaoId);
    if (!capitulo) {
      return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
    }

    // Idempotente: marcar de novo não duplica fruto (o par formando+capítulo é
    // único). O valor do fruto é fixado pelo sistema no momento da ação.
    await prisma.acaoLeitura.upsert({
      where: { formandoId_capituloId: { formandoId, capituloId: capitulo.id } },
      create: {
        organizacaoId,
        formandoId,
        leituraId: capitulo.leituraId,
        capituloId: capitulo.id,
        tipo: "leitura",
        frutos: FRUTOS_POR_ACAO.leitura,
      },
      update: {},
    });

    logAction("travessia_capitulo_lido", undefined, getClientIp(request), { formandoId, capituloId: capitulo.id, leituraId: capitulo.leituraId }, organizacaoId);
    return NextResponse.json({ ok: true, lido: true });
  } catch (err) {
    logError("portal travessia capitulo POST", err);
    return NextResponse.json({ error: "Falha ao registrar leitura" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { capituloId } = await params;
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
    const capitulo = await resolve(capituloId, formandoId, organizacaoId);
    if (!capitulo) {
      return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
    }

    // Gamificação aditiva: desmarcar remove só a linha daquele capítulo.
    await prisma.acaoLeitura.deleteMany({ where: { formandoId, capituloId: capitulo.id } });

    logAction("travessia_capitulo_desmarcado", undefined, getClientIp(request), { formandoId, capituloId: capitulo.id }, organizacaoId);
    return NextResponse.json({ ok: true, lido: false });
  } catch (err) {
    logError("portal travessia capitulo DELETE", err);
    return NextResponse.json({ error: "Falha ao atualizar leitura" }, { status: 500 });
  }
}
