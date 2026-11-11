import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { temPermissao } from "@/types";
import type { SessionUser } from "@/lib/auth-helpers";
import { carregarDossieFormando } from "@/lib/relatorios/dossie-formando-loader";
import { renderRelatorioEtapaPdf } from "@/lib/relatorios/relatorio-etapa-pdf";
import { carregarContextoPdf, dataCurtaPtBr, dataLongaPtBr, dataLongaDe } from "@/lib/relatorios/pdf-contexto";
import type { NotaAdesao, RecomendacaoEtapa } from "@/types";

function slugify(s: string): string {
  return (
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/^-+|-+$/g, "") ||
    "formando"
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id || !user.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const organizacaoId = user.organizacaoId;

  try {
    const relatorio = await prisma.relatorioEtapa.findFirst({
      where: { id, organizacaoId },
      include: {
        formando: { select: { id: true, nome: true, grupoFormacaoId: true } },
        formador: { select: { nome: true } },
      },
    });
    if (!relatorio) return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 });

    const isFC = user.role === "formador_comunitario";
    const podeVer =
      temPermissao(user.role, "formador_geral") ||
      (isFC && relatorio.formando.grupoFormacaoId === user.grupoFormacaoId);
    if (!podeVer) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const rl = await limiters.export(user.id);
    if (!rl.allowed) return NextResponse.json({ error: "Limite de exportações atingido. Aguarde." }, { status: 429 });

    const result = await carregarDossieFormando(organizacaoId, relatorio.formando.id);
    if (!result) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
    const dossie = result.dossie;

    const [ctx, grupo, { fotoParaDataUrl }] = await Promise.all([
      carregarContextoPdf(organizacaoId),
      relatorio.formando.grupoFormacaoId
        ? prisma.grupoFormacao.findFirst({ where: { id: relatorio.formando.grupoFormacaoId, organizacaoId }, select: { nome: true } })
        : Promise.resolve(null),
      import("@/lib/relatorios/foto-dataurl"),
    ]);
    const fotoDataUrl = await fotoParaDataUrl(dossie.identificacao.fotoKey);

    const pdf = await renderRelatorioEtapaPdf({
      orgNome: ctx.orgNome,
      grupoNome: grupo?.nome ?? "—",
      formadorNome: relatorio.formador?.nome ?? null,
      geradoEm: dataCurtaPtBr(),
      dataLonga: dataLongaPtBr(),
      etapaLabel: ctx.etapaLabel(dossie.etapa),
      dossie,
      relatorio: {
        avaliacaoHumana: relatorio.avaliacaoHumana as NotaAdesao | null,
        avaliacaoEspiritual: relatorio.avaliacaoEspiritual as NotaAdesao | null,
        avaliacaoComunitaria: relatorio.avaliacaoComunitaria as NotaAdesao | null,
        textoNarrativo: relatorio.textoNarrativo,
        pontosForteza: relatorio.pontosForteza,
        desafios: relatorio.desafios,
        recomendacao: relatorio.recomendacao as RecomendacaoEtapa | null,
        textoRecomendacao: relatorio.textoRecomendacao,
        autorNome: relatorio.formador?.nome ?? null,
        finalizadoEm: relatorio.status === "finalizado" ? dataLongaDe(relatorio.atualizadoEm.toISOString()) : null,
      },
      fotoDataUrl,
      branding: ctx.branding,
    });

    logAction("relatorio_etapa_pdf_exportado", user.id, getClientIp(req), { id }, organizacaoId);

    const nome = `relatorio-etapa-${slugify(dossie.identificacao.nome)}-${new Date().toISOString().slice(0, 10)}`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logError("relatorios [id] pdf GET", err);
    return NextResponse.json({ error: "Falha ao gerar o dossiê" }, { status: 500 });
  }
}
