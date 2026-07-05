import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { EvangelizacaoSchema, parseJson } from "@/lib/schemas";
import { FRUTOS_POR_ACAO } from "@/types";
import type { TipoAcaoLeitura } from "@/types";

/**
 * Evangelização da Travessia: o vocacionado registra ter divulgado sua leitura no
 * Instagram (card on-brand + share nativo — sem prova, crédito na confiança) ou no
 * YouTube (link do vídeo). Rende Fruto UMA VEZ por rede na travessia inteira.
 *
 * A ação não é por capítulo (`capituloId` nulo); é ancorada ao PRIMEIRO livro
 * ativo da turma só para satisfazer a FK e manter o escopo org+turma dos Frutos.
 */

const TIPO_POR_REDE: Record<"instagram" | "youtube", TipoAcaoLeitura> = {
  instagram: "evangelizacao_instagram",
  youtube: "evangelizacao_youtube",
};

function readHeaders(request: Request) {
  return {
    formandoId: request.headers.get("x-formando-id"),
    organizacaoId: request.headers.get("x-formando-org"),
  };
}

/**
 * Autoriza pela PERTENÇA (gate anti-IDOR) e devolve o livro-âncora: o formando tem
 * de estar vinculado a uma turma com ao menos um livro ATIVO. Sem livro, não há
 * travessia para evangelizar → null.
 */
async function resolveAncora(formandoId: string, organizacaoId: string) {
  const formando = await prisma.formando.findFirst({
    where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
    select: { grupoFormacaoId: true },
  });
  if (!formando?.grupoFormacaoId) return null;

  const livro = await prisma.leituraVocacional.findFirst({
    where: { turmaId: formando.grupoFormacaoId, organizacaoId, ativo: true },
    orderBy: { ordem: "asc" },
    select: { id: true, turmaId: true },
  });
  return livro;
}

export async function POST(request: Request) {
  const { formandoId, organizacaoId } = readHeaders(request);
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, EvangelizacaoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { rede, url } = parsed.data;
    const tipo = TIPO_POR_REDE[rede];

    const ancora = await resolveAncora(formandoId, organizacaoId);
    if (!ancora) {
      return NextResponse.json({ error: "Nenhuma leitura ativa na sua turma" }, { status: 404 });
    }

    // Uma ação por rede na travessia (escopada aos livros ativos da turma). Se já
    // existe: idempotente — só atualiza o link do YouTube; nunca duplica o Fruto.
    const existente = await prisma.acaoLeitura.findFirst({
      where: { formandoId, organizacaoId, tipo, leitura: { turmaId: ancora.turmaId, ativo: true } },
      select: { id: true },
    });

    if (existente) {
      if (rede === "youtube" && url) {
        await prisma.acaoLeitura.update({ where: { id: existente.id }, data: { texto: url } });
      }
      return NextResponse.json({ ok: true, jaRegistrado: true });
    }

    await prisma.acaoLeitura.create({
      data: {
        organizacaoId,
        formandoId,
        leituraId: ancora.id,
        capituloId: null,
        tipo,
        frutos: FRUTOS_POR_ACAO[tipo],
        texto: rede === "youtube" ? url ?? null : null,
      },
    });

    logAction("travessia_evangelizacao_registrada", undefined, getClientIp(request), { formandoId, rede }, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal travessia evangelizacao POST", err);
    return NextResponse.json({ error: "Falha ao registrar evangelização" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { formandoId, organizacaoId } = readHeaders(request);
  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const rl = await limiters.mutation(formandoId);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  }

  try {
    const rede = new URL(request.url).searchParams.get("rede");
    if (rede !== "instagram" && rede !== "youtube") {
      return NextResponse.json({ error: "Rede inválida" }, { status: 400 });
    }
    const tipo = TIPO_POR_REDE[rede];

    const ancora = await resolveAncora(formandoId, organizacaoId);
    if (!ancora) {
      return NextResponse.json({ error: "Nenhuma leitura ativa na sua turma" }, { status: 404 });
    }

    // Aditivo: some só a linha desta rede nos livros ativos da turma.
    await prisma.acaoLeitura.deleteMany({
      where: { formandoId, organizacaoId, tipo, leitura: { turmaId: ancora.turmaId, ativo: true } },
    });

    logAction("travessia_evangelizacao_removida", undefined, getClientIp(request), { formandoId, rede }, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal travessia evangelizacao DELETE", err);
    return NextResponse.json({ error: "Falha ao remover evangelização" }, { status: 500 });
  }
}
