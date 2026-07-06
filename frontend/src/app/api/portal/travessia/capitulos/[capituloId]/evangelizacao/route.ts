import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { limiters } from "@/lib/rate-limit";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { EvangelizacaoSchema, parseJson } from "@/lib/schemas";
import { FRUTOS_POR_ACAO } from "@/types";
import type { TipoAcaoLeitura } from "@/types";

type Params = { params: Promise<{ capituloId: string }> };

/**
 * Evangelização POR CAPÍTULO: o vocacionado registra ter divulgado a leitura de um
 * capítulo no Instagram (link OPCIONAL) ou no YouTube (link do vídeo, obrigatório).
 * Rende Fruto UMA VEZ por rede em cada capítulo (crédito na confiança — sem prova).
 * O @ da comunidade é reforçado pelo formador no dia a dia.
 */

const TIPO_POR_REDE: Record<"instagram" | "youtube", TipoAcaoLeitura> = {
  instagram: "evangelizacao_instagram",
  youtube: "evangelizacao_youtube",
};

/**
 * Autoriza e resolve o capítulo pela PERTENÇA (gate anti-IDOR): o capítulo tem de
 * pertencer a um livro ATIVO da MESMA turma vocacional do formando. Espelha o
 * `resolve` da partilha. Um `capituloId` de outra turma/organização → 404.
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
  return {
    formandoId: request.headers.get("x-formando-id"),
    organizacaoId: request.headers.get("x-formando-org"),
  };
}

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
    const parsed = await parseJson(request, EvangelizacaoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { rede, url } = parsed.data;
    const tipo = TIPO_POR_REDE[rede];

    const capitulo = await resolve(capituloId, formandoId, organizacaoId);
    if (!capitulo) {
      return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
    }

    // Idempotente pelo par (formando, capítulo, rede): reregistrar só atualiza o
    // link, nunca duplica o Fruto (valor fixado na criação).
    await prisma.acaoLeitura.upsert({
      where: {
        formandoId_capituloId_tipo: { formandoId, capituloId: capitulo.id, tipo },
      },
      create: {
        organizacaoId,
        formandoId,
        leituraId: capitulo.leituraId,
        capituloId: capitulo.id,
        tipo,
        frutos: FRUTOS_POR_ACAO[tipo],
        // Link opcional no Instagram; obrigatório (validado) no YouTube.
        texto: url ?? null,
      },
      update: { texto: url ?? null },
      select: { id: true },
    });

    logAction("travessia_evangelizacao_registrada", undefined, getClientIp(request), { formandoId, capituloId: capitulo.id, rede }, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal travessia evangelizacao capitulo POST", err);
    return NextResponse.json({ error: "Falha ao registrar evangelização" }, { status: 500 });
  }
}

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
    const rede = new URL(request.url).searchParams.get("rede");
    if (rede !== "instagram" && rede !== "youtube") {
      return NextResponse.json({ error: "Rede inválida" }, { status: 400 });
    }
    const tipo = TIPO_POR_REDE[rede];

    const capitulo = await resolve(capituloId, formandoId, organizacaoId);
    if (!capitulo) {
      return NextResponse.json({ error: "Capítulo não encontrado" }, { status: 404 });
    }

    await prisma.acaoLeitura.deleteMany({
      where: { formandoId, capituloId: capitulo.id, tipo },
    });

    logAction("travessia_evangelizacao_removida", undefined, getClientIp(request), { formandoId, capituloId: capitulo.id, rede }, organizacaoId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("portal travessia evangelizacao capitulo DELETE", err);
    return NextResponse.json({ error: "Falha ao remover evangelização" }, { status: 500 });
  }
}
