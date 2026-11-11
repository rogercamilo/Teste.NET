import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logError } from "@/lib/audit-log";
import { temPermissao } from "@/types";
import type { SessionUser } from "@/lib/auth-helpers";
import { carregarDossieFormando } from "@/lib/relatorios/dossie-formando-loader";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ formandoId: string }> }) {
  const { formandoId } = await params;
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.id || !user.organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const result = await carregarDossieFormando(user.organizacaoId, formandoId);
    if (!result) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    // Coordenação (FG/Admin) OU o Formador Comunitário da própria morada do formando.
    const isFC = user.role === "formador_comunitario";
    const podeVer =
      temPermissao(user.role, "formador_geral") ||
      (isFC && result.formando.grupoFormacaoId === user.grupoFormacaoId);
    if (!podeVer) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

    return NextResponse.json(result.dossie);
  } catch (err) {
    logError("relatorios dossie GET", err);
    return NextResponse.json({ error: "Falha ao carregar dossiê" }, { status: 500 });
  }
}
