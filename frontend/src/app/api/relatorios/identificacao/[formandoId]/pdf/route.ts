import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { ESTADO_CIVIL_LABELS, temPermissao, type EstadoCivil, type NivelFormativo } from "@/types";
import { idadeEmAnos } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth-helpers";
import { renderIdentificacaoVisualPdf } from "@/lib/relatorios/identificacao-visual-pdf";
import { carregarContextoPdf, dataCurtaPtBr, dataLongaPtBr } from "@/lib/relatorios/pdf-contexto";

function slugify(s: string): string {
  return (
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/^-+|-+$/g, "") ||
    "formando"
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ formandoId: string }> }) {
  const { formandoId } = await params;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id || !user.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const organizacaoId = user.organizacaoId;

  try {
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId, deletedAt: null },
      select: { id: true, nome: true, dataNascimento: true, estadoCivil: true, foto: true, nivelFormativo: true, grupoFormacaoId: true },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const isFC = user.role === "formador_comunitario";
    const podeVer =
      temPermissao(user.role, "formador_geral") ||
      (isFC && formando.grupoFormacaoId === user.grupoFormacaoId);
    if (!podeVer) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const rl = await limiters.export(user.id);
    if (!rl.allowed) return NextResponse.json({ error: "Limite de exportações atingido. Aguarde." }, { status: 429 });

    const [ctx, grupo, { fotoParaDataUrl }] = await Promise.all([
      carregarContextoPdf(organizacaoId),
      formando.grupoFormacaoId
        ? prisma.grupoFormacao.findFirst({ where: { id: formando.grupoFormacaoId, organizacaoId }, select: { nome: true } })
        : Promise.resolve(null),
      import("@/lib/relatorios/foto-dataurl"),
    ]);
    const fotoDataUrl = await fotoParaDataUrl(formando.foto);

    const pdf = await renderIdentificacaoVisualPdf({
      orgNome: ctx.orgNome,
      grupoNome: grupo?.nome ?? "—",
      etapaLabel: ctx.etapaLabel(formando.nivelFormativo as NivelFormativo),
      geradoEm: dataCurtaPtBr(),
      dataLonga: dataLongaPtBr(),
      nome: formando.nome,
      idade: idadeEmAnos(formando.dataNascimento?.toISOString().split("T")[0] ?? null),
      estadoCivilLabel: ESTADO_CIVIL_LABELS[formando.estadoCivil as EstadoCivil] ?? formando.estadoCivil,
      fotoDataUrl,
      branding: ctx.branding,
    });

    logAction("identificacao_visual_pdf_exportado", user.id, getClientIp(req), { formandoId }, organizacaoId);

    const nome = `identificacao-${slugify(formando.nome)}`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logError("relatorios identificacao pdf GET", err);
    return NextResponse.json({ error: "Falha ao gerar a identificação" }, { status: 500 });
  }
}
