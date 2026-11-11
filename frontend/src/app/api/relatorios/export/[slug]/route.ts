import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { getRelatorioDef, podeVerRelatorio, normalizarPeriodo } from "@/lib/relatorios/catalogo";
import { carregarRelatorio } from "@/lib/relatorios/carregar";
import { renderRelatorioPdf } from "@/lib/relatorios/pdf";
import { relatorioParaCsv } from "@/lib/relatorios/csv-export";
import type { SessionUser } from "@/lib/auth-helpers";
import type { PerfilUsuario } from "@/types";

function slugFilename(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toLowerCase()
      .replace(/^-+|-+$/g, "") || "relatorio"
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id || !user.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const perfil = (user.role ?? "formador_comunitario") as PerfilUsuario;
  const def = getRelatorioDef(slug);
  if (!def || !podeVerRelatorio(perfil, slug)) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const rl = await limiters.export(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Limite de exportações atingido. Aguarde." }, { status: 429 });
  }

  const periodoDias = normalizarPeriodo(req.nextUrl.searchParams.get("periodo"));
  const moradaId = req.nextUrl.searchParams.get("morada");
  const formato = (req.nextUrl.searchParams.get("formato") ?? "pdf").toLowerCase();

  try {
    const carregado = await carregarRelatorio(def.slug, {
      organizacaoId: user.organizacaoId,
      perfil,
      grupoFormacaoId: user.grupoFormacaoId ?? null,
      userId: user.id,
      moradaId,
      periodoDias,
    });

    if (!carregado.resultado) {
      return NextResponse.json({ error: "Selecione a morada para exportar este relatório." }, { status: 400 });
    }

    const nome = `relatorio-${slugFilename(def.titulo)}-${new Date().toISOString().slice(0, 10)}`;
    logAction("relatorio_exportado", user.id, getClientIp(req), { slug: def.slug, formato }, user.organizacaoId);

    if (formato === "csv") {
      const csv = relatorioParaCsv(carregado);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`${nome}.csv`)}`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdf = await renderRelatorioPdf(carregado);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    logError("relatorios export GET", err);
    return NextResponse.json({ error: "Falha ao gerar relatório" }, { status: 500 });
  }
}
