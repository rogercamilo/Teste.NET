import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { lavrarTermo, LivroError, parseDataLocal } from "@/lib/livro-registro";
import { TIPOS_TERMO_MANUAIS, type TipoTermoRegistro } from "@/types";
import { requireLivroAccess } from "../guard";

export async function GET(req: NextRequest) {
  const gate = await requireLivroAccess({ minPapel: "formador_geral" });
  if ("error" in gate) return gate.error;
  const { organizacaoId } = gate.access;

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") ?? undefined;
  const formandoId = searchParams.get("formandoId") ?? undefined;
  const tomoId = searchParams.get("tomoId") ?? undefined;

  try {
    const termos = await prisma.termoRegistro.findMany({
      where: {
        organizacaoId,
        ...(tipo ? { tipo: tipo as TipoTermoRegistro } : {}),
        ...(formandoId ? { formandoId } : {}),
        ...(tomoId ? { tomoId } : {}),
      },
      include: { formando: { select: { nome: true } }, tomo: { select: { numero: true } } },
      orderBy: [{ tomo: { numero: "asc" } }, { numero: "asc" }],
    });

    return NextResponse.json(
      termos.map((t) => ({
        id: t.id,
        tomoId: t.tomoId,
        tomoNumero: t.tomo.numero,
        numero: t.numero,
        tipo: t.tipo,
        formandoId: t.formandoId,
        formandoNome: t.formando?.nome ?? null,
        dataEvento: t.dataEvento.toISOString(),
        dataLavratura: t.dataLavratura.toISOString(),
        corpoTexto: t.corpoTexto,
        condicaoResultante: t.condicaoResultante,
        processoId: t.processoId,
        registroPromessaId: t.registroPromessaId,
        arquivoRefId: t.arquivoRefId,
        retificaTermoId: t.retificaTermoId,
        lavradoAutomaticamente: t.lavradoAutomaticamente,
      }))
    );
  } catch (err) {
    logError("livro-registro termos GET", err);
    return NextResponse.json({ error: "Falha ao carregar termos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireLivroAccess({ minPapel: "administrador" });
  if ("error" in gate) return gate.error;
  const { user, organizacaoId } = gate.access;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      tipo: TipoTermoRegistro;
      formandoId?: string;
      dataEvento?: string;
      etapaNome?: string;
      motivo?: string;
      autoridade?: string;
      localFalecimento?: string;
      retificaTermoId?: string;
      retificaDescricao?: string;
    };

    if (!TIPOS_TERMO_MANUAIS.includes(body.tipo)) {
      return NextResponse.json({ error: "Tipo de termo não pode ser lavrado manualmente" }, { status: 400 });
    }

    const dataEvento = body.dataEvento ? parseDataLocal(body.dataEvento) : new Date();
    let formandoId = body.formandoId ?? null;
    let formandoNome = "";
    let retificaTermoNumero: number | undefined;

    if (body.tipo === "retificacao") {
      if (!body.retificaTermoId || !body.retificaDescricao?.trim()) {
        return NextResponse.json({ error: "Retificação exige o termo original e a descrição da correção" }, { status: 400 });
      }
      const original = await prisma.termoRegistro.findFirst({
        where: { id: body.retificaTermoId, organizacaoId },
        select: { numero: true, formandoId: true, formando: { select: { nome: true } } },
      });
      if (!original) return NextResponse.json({ error: "Termo a retificar não encontrado" }, { status: 404 });
      retificaTermoNumero = original.numero;
      formandoId = original.formandoId;
      formandoNome = original.formando?.nome ?? "";
    } else {
      if (!formandoId) {
        return NextResponse.json({ error: "formandoId é obrigatório" }, { status: 400 });
      }
      const formando = await prisma.formando.findFirst({
        where: { id: formandoId, organizacaoId, deletedAt: null },
        select: { nome: true },
      });
      if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
      formandoNome = formando.nome;
    }

    // Lavratura com retry em colisão de numeração (índice único tomoId+numero).
    let termo;
    for (let tentativa = 0; ; tentativa++) {
      try {
        termo = await prisma.$transaction((tx) =>
          lavrarTermo(tx, {
            organizacaoId,
            tipo: body.tipo,
            formandoId,
            dataEvento,
            criadoPorId: user.id,
            lavradoAutomaticamente: false,
            retificaTermoId: body.tipo === "retificacao" ? body.retificaTermoId : null,
            contexto: {
              formandoNome,
              dataEvento,
              etapaNome: body.etapaNome,
              motivo: body.motivo,
              autoridade: body.autoridade,
              localFalecimento: body.localFalecimento,
              retificaTermoNumero,
              retificaDescricao: body.retificaDescricao,
            },
          })
        );
        break;
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && tentativa < 3) {
          continue;
        }
        throw err;
      }
    }

    logAction(
      body.tipo === "retificacao" ? "livro_termo_retificado" : "livro_termo_lavrado",
      user.id,
      getClientIp(req),
      { termoId: termo.id, tipo: body.tipo, numero: termo.numero },
      organizacaoId
    );
    return NextResponse.json({ id: termo.id, numero: termo.numero }, { status: 201 });
  } catch (err) {
    if (err instanceof LivroError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    logError("livro-registro termos POST", err);
    return NextResponse.json({ error: "Falha ao lavrar termo" }, { status: 500 });
  }
}
