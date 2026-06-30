import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";
import type { TipoRegistroPromessa } from "@/types";
import { requireLivroAccess } from "../livro-registro/guard";

export async function GET(req: NextRequest) {
  const gate = await requireLivroAccess({ minPapel: "formador_geral" });
  if ("error" in gate) return gate.error;
  const { organizacaoId } = gate.access;

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo") ?? undefined;
  const formandoId = searchParams.get("formandoId") ?? undefined;

  try {
    const registros = await prisma.registroPromessa.findMany({
      where: {
        organizacaoId,
        ...(tipo ? { tipo: tipo as TipoRegistroPromessa } : {}),
        ...(formandoId ? { formandoId } : {}),
      },
      include: { formando: { select: { nome: true } } },
      orderBy: [{ tomo: "asc" }, { numero: "asc" }],
    });

    return NextResponse.json(
      registros.map((r) => ({
        id: r.id,
        tipo: r.tipo,
        tomo: r.tomo,
        folha: r.folha,
        numero: r.numero,
        numeroRegistro: r.numeroRegistro,
        formandoId: r.formandoId,
        formandoNome: r.formando?.nome ?? null,
        dataVigenciaInicio: r.dataVigenciaInicio.toISOString(),
        dataVigenciaFim: r.dataVigenciaFim?.toISOString() ?? null,
        celebrante: r.celebrante,
        localCelebracao: r.localCelebracao,
        moderadorGeral: r.moderadorGeral,
        formadorGeralLocal: r.formadorGeralLocal,
        assistenteEclesiastico: r.assistenteEclesiastico,
        secretario: r.secretario,
        formulaTexto: r.formulaTexto,
        criadoEm: r.criadoEm.toISOString(),
      }))
    );
  } catch (err) {
    logError("livro-promessas GET", err);
    return NextResponse.json({ error: "Falha ao carregar registros" }, { status: 500 });
  }
}
