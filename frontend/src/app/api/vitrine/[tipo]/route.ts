import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";
import type { SessionUser } from "@/lib/auth-helpers";
import { temPermissao, hasVocacionalAccess } from "@/types";
import { renderTemplate } from "@/lib/documentos-eclesiasticos/templates";
import { dadosFicticios } from "@/lib/documentos-eclesiasticos/dados-ficticios";
import { isTipoVitrine, MARCA_DAGUA_PREVIEW } from "@/lib/vitrine";
import { resolveDocumentoBranding } from "@/lib/documentos-eclesiasticos/branding";

type RouteCtx = { params: Promise<{ tipo: string }> };

/**
 * Preview server-side de um modelo da Jornada, com dados fictícios + marca
 * d'água. NUNCA expõe o template cru nem dados reais. Gating: autenticado +
 * papel formador_geral+ + org com acesso à Jornada (canônica ou vocacional).
 */
export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!temPermissao(user.role, "formador_geral")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const org = await prisma.organizacao.findUnique({
    where: { id: user.organizacaoId },
    select: { tipoOrganizacao: true, vocacionalHabilitado: true, temaCor: true, logoUrl: true, documentosTextos: true },
  });
  if (!hasVocacionalAccess(org?.tipoOrganizacao, org?.vocacionalHabilitado)) {
    return NextResponse.json({ error: "Recurso indisponível para este tipo de organização" }, { status: 403 });
  }

  const { tipo } = await params;
  if (!isTipoVitrine(tipo)) {
    return NextResponse.json({ error: "Modelo não disponível na vitrine" }, { status: 404 });
  }

  try {
    const dados = {
      ...dadosFicticios(),
      marcaDagua: MARCA_DAGUA_PREVIEW,
      branding: resolveDocumentoBranding(org),
      textosCustom: (org?.documentosTextos as Record<string, string> | null) ?? {},
    };
    const pdf = await renderTemplate(tipo, dados);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="modelo-${tipo}.pdf"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    logError("vitrine preview", err);
    return NextResponse.json({ error: "Falha ao gerar o modelo" }, { status: 500 });
  }
}
