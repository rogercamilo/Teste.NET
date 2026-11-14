import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { ESTADO_CIVIL_LABELS, temPermissao, type EstadoCivil, type NivelFormativo } from "@/types";
import { idadeEmAnos } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth-helpers";
import { renderCarometroGrupoPdf } from "@/lib/relatorios/carometro-grupo-pdf";
import { carregarContextoPdf, dataCurtaPtBr, dataLongaPtBr } from "@/lib/relatorios/pdf-contexto";

function slugify(s: string): string {
  return (
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase().replace(/^-+|-+$/g, "") ||
    "grupo"
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
    const grupo = await prisma.grupoFormacao.findFirst({
      where: { id, organizacaoId },
      select: { id: true, nome: true },
    });
    if (!grupo) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });

    const isFC = user.role === "formador_comunitario";
    const podeVer = temPermissao(user.role, "formador_geral") || (isFC && user.grupoFormacaoId === id);
    if (!podeVer) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    const rl = await limiters.export(user.id);
    if (!rl.allowed) return NextResponse.json({ error: "Limite de exportações atingido. Aguarde." }, { status: 429 });

    const formandos = await prisma.formando.findMany({
      where: { grupoFormacaoId: id, organizacaoId, ativo: true, deletedAt: null },
      select: { nome: true, dataNascimento: true, estadoCivil: true, foto: true, nivelFormativo: true },
      orderBy: { nome: "asc" },
    });

    const [ctx, { fotoParaDataUrl }] = await Promise.all([
      carregarContextoPdf(organizacaoId),
      import("@/lib/relatorios/foto-dataurl"),
    ]);
    const fotos = await Promise.all(formandos.map((f) => fotoParaDataUrl(f.foto)));

    const pdf = await renderCarometroGrupoPdf({
      orgNome: ctx.orgNome,
      grupoNome: grupo.nome,
      geradoEm: dataCurtaPtBr(),
      dataLonga: dataLongaPtBr(),
      branding: ctx.branding,
      formandos: formandos.map((f, i) => ({
        nome: f.nome,
        idade: idadeEmAnos(f.dataNascimento?.toISOString().split("T")[0] ?? null),
        estadoCivilLabel: ESTADO_CIVIL_LABELS[f.estadoCivil as EstadoCivil] ?? f.estadoCivil,
        etapaLabel: ctx.etapaLabel(f.nivelFormativo as NivelFormativo),
        fotoDataUrl: fotos[i],
      })),
    });

    logAction("carometro_grupo_pdf_exportado", user.id, getClientIp(req), { grupoId: id, total: formandos.length }, organizacaoId);

    const nome = `carometro-${slugify(grupo.nome)}`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logError("grupos-formacao carometro pdf GET", err);
    return NextResponse.json({ error: "Falha ao gerar o carômetro" }, { status: 500 });
  }
}
