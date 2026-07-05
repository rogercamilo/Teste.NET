import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { PartilhaLeituraSchema, parseJson } from "@/lib/schemas";
import { FRUTOS_POR_ACAO } from "@/types";

type Params = { params: Promise<{ capituloId: string }> };

/**
 * Autoriza e resolve o capítulo pela PERTENÇA (gate anti-IDOR): o capítulo tem de
 * pertencer a um livro ATIVO da MESMA turma vocacional em que o formando está
 * vinculado. Espelha o `resolve` da rota de leitura (`../route.ts`). Um
 * `capituloId` de outra turma/organização não resolve → 404.
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

function readHeaders(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");
  return { formandoId, organizacaoId };
}

/**
 * Cria/atualiza a partilha textual do capítulo. Idempotente pelo par
 * (formando, capítulo, tipo=partilha): reeditar o texto NÃO gera novo Fruto — o
 * valor é fixado na criação (gamificação aditiva, histórico imutável). Editar
 * também NÃO limpa a reação do formador, que segue válida sobre a reflexão.
 */
export async function POST(request: Request, { params }: Params) {
  const { capituloId } = await params;
  const { formandoId, organizacaoId } = readHeaders(request);
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, PartilhaLeituraSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const capitulo = await resolve(capituloId, formandoId, organizacaoId);
    if (!capitulo) {
      return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
    }

    const acao = await prisma.acaoLeitura.upsert({
      where: {
        formandoId_capituloId_tipo: { formandoId, capituloId: capitulo.id, tipo: "partilha" },
      },
      create: {
        organizacaoId,
        formandoId,
        leituraId: capitulo.leituraId,
        capituloId: capitulo.id,
        tipo: "partilha",
        frutos: FRUTOS_POR_ACAO.partilha,
        texto: parsed.data.texto,
      },
      // Só o texto muda ao reeditar — frutos/reação preservados.
      update: { texto: parsed.data.texto },
      select: { texto: true },
    });

    logAction("travessia_partilha_registrada", undefined, getClientIp(request), { formandoId, capituloId: capitulo.id, leituraId: capitulo.leituraId }, organizacaoId);
    return NextResponse.json({ ok: true, texto: acao.texto });
  } catch (err) {
    logError("portal travessia partilha POST", err);
    return NextResponse.json({ error: "Falha ao registrar partilha" }, { status: 500 });
  }
}

/**
 * Remove a partilha do capítulo (retira o Fruto — aditivo: some só esta linha).
 */
export async function DELETE(request: Request, { params }: Params) {
  const { capituloId } = await params;
  const { formandoId, organizacaoId } = readHeaders(request);
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

    await prisma.acaoLeitura.deleteMany({
      where: { formandoId, capituloId: capitulo.id, tipo: "partilha" },
    });

    logAction("travessia_partilha_removida", undefined, getClientIp(request), { formandoId, capituloId: capitulo.id }, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal travessia partilha DELETE", err);
    return NextResponse.json({ error: "Falha ao remover partilha" }, { status: 500 });
  }
}
