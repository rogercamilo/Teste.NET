import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";
import { renderLivroPdf } from "@/lib/documentos-eclesiasticos/templates/livro-registro";
import { dataCurta } from "@/lib/livro-registro";
import { TIPO_TERMO_LABELS, TIPO_TERMO_TAGS } from "@/types";
import { requireLivroAccess } from "../guard";

function dataLonga(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export async function GET(req: NextRequest) {
  const gate = await requireLivroAccess({ minPapel: "formador_geral" });
  if ("error" in gate) return gate.error;
  const { organizacaoId } = gate.access;

  const { searchParams } = new URL(req.url);
  const tomoId = searchParams.get("tomoId") ?? undefined;

  try {
    const org = await prisma.organizacao.findUnique({
      where: { id: organizacaoId },
      select: { nome: true },
    });

    const tomo = await prisma.livroRegistroTomo.findFirst({
      where: { organizacaoId, ...(tomoId ? { id: tomoId } : { status: "aberto" }) },
      include: { termos: { orderBy: { numero: "asc" } } },
      orderBy: { numero: "desc" },
    });

    if (!tomo) {
      return NextResponse.json({ error: "Nenhum tomo encontrado" }, { status: 404 });
    }

    const pdf = await renderLivroPdf({
      orgNome: org?.nome ?? "Organização",
      numeroTomo: tomo.numero,
      totalFolhas: tomo.totalFolhas,
      aberturaTexto: tomo.aberturaTexto,
      aberturaData: dataLonga(tomo.aberturaData),
      aberturaModerador: tomo.aberturaModerador,
      aberturaSecretario: tomo.aberturaSecretario,
      encerramentoTexto: tomo.encerramentoTexto,
      encerramentoData: tomo.encerramentoData ? dataLonga(tomo.encerramentoData) : null,
      termos: tomo.termos.map((t) => ({
        numero: t.numero,
        tipoLabel: TIPO_TERMO_LABELS[t.tipo],
        tag: TIPO_TERMO_TAGS[t.tipo],
        corpoTexto: t.corpoTexto,
        rubrica: t.lavradoAutomaticamente
          ? `Lavrado automaticamente em ${dataCurta(t.dataLavratura)}.`
          : `Lavrado por determinação do(a) administrador(a) em ${dataCurta(t.dataLavratura)}, com registro em log de auditoria.`,
      })),
    });

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="livro-registro-tomo-${tomo.numero}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logError("livro-registro pdf GET", err);
    return NextResponse.json({ error: "Falha ao gerar PDF do livro" }, { status: 500 });
  }
}
