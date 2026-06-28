import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { montarTextoAbertura, parseDataLocal } from "@/lib/livro-registro";
import { requireLivroAccess } from "../guard";

export async function GET() {
  const gate = await requireLivroAccess({ minPapel: "formador_geral" });
  if ("error" in gate) return gate.error;
  const { organizacaoId } = gate.access;

  try {
    const tomos = await prisma.livroRegistroTomo.findMany({
      where: { organizacaoId },
      orderBy: { numero: "desc" },
      include: { _count: { select: { termos: true } } },
    });

    return NextResponse.json(
      tomos.map((t) => ({
        id: t.id,
        numero: t.numero,
        totalFolhas: t.totalFolhas,
        status: t.status,
        aberturaData: t.aberturaData.toISOString(),
        aberturaModerador: t.aberturaModerador,
        aberturaSecretario: t.aberturaSecretario,
        aberturaTexto: t.aberturaTexto,
        aberturaArquivoId: t.aberturaArquivoId,
        encerramentoData: t.encerramentoData?.toISOString() ?? null,
        encerramentoTexto: t.encerramentoTexto,
        encerramentoArquivoId: t.encerramentoArquivoId,
        totalTermos: t._count.termos,
      }))
    );
  } catch (err) {
    logError("livro-registro tomos GET", err);
    return NextResponse.json({ error: "Falha ao carregar tomos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireLivroAccess({ minPapel: "administrador" });
  if ("error" in gate) return gate.error;
  const { user, organizacaoId } = gate.access;

  try {
    const body = (await req.json()) as {
      aberturaData?: string;
      aberturaModerador?: string;
      aberturaSecretario?: string;
      totalFolhas?: number;
    };

    if (!body.aberturaModerador?.trim() || !body.aberturaSecretario?.trim()) {
      return NextResponse.json({ error: "Moderador e Secretário são obrigatórios" }, { status: 400 });
    }

    const aberto = await prisma.livroRegistroTomo.findFirst({
      where: { organizacaoId, status: "aberto" },
      select: { id: true, numero: true },
    });
    if (aberto) {
      return NextResponse.json(
        { error: `O Tomo ${aberto.numero} ainda está aberto. Encerre-o antes de abrir um novo.` },
        { status: 409 }
      );
    }

    const ultimo = await prisma.livroRegistroTomo.aggregate({
      where: { organizacaoId },
      _max: { numero: true },
    });
    const numero = (ultimo._max.numero ?? 0) + 1;
    const totalFolhas = body.totalFolhas && body.totalFolhas > 0 ? body.totalFolhas : 200;
    const aberturaData = body.aberturaData ? parseDataLocal(body.aberturaData) : new Date();

    const tomo = await prisma.livroRegistroTomo.create({
      data: {
        organizacaoId,
        numero,
        totalFolhas,
        aberturaData,
        aberturaModerador: body.aberturaModerador.trim(),
        aberturaSecretario: body.aberturaSecretario.trim(),
        aberturaTexto: montarTextoAbertura({ numeroTomo: numero, totalFolhas }),
      },
    });

    logAction("livro_tomo_aberto", user.id, getClientIp(req), { tomoId: tomo.id, numero }, organizacaoId);
    return NextResponse.json({ id: tomo.id, numero: tomo.numero }, { status: 201 });
  } catch (err) {
    logError("livro-registro tomos POST", err);
    return NextResponse.json({ error: "Falha ao abrir tomo" }, { status: 500 });
  }
}
