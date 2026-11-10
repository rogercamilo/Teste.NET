import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { SessionUser } from "@/lib/auth-helpers";

type RouteCtx = { params: Promise<{ id: string }> };

/**
 * Encaminhamento do pedido de LICENÇA pelo RESPONSÁVEL (ficha do formando).
 * `atendida` = a autoridade assumiu (tipicamente ao abrir o processo de licença);
 * `recusada` = arquiva o pedido (não é o indeferimento canônico, que segue pelos
 * estatutos/diálogo). O ato formal permanece no ProcessoEclesiastico, não aqui.
 */
export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const { id: formandoId } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      solicitacaoId?: string;
      status?: "atendida" | "recusada";
    };
    if (!body.solicitacaoId || (body.status !== "atendida" && body.status !== "recusada")) {
      return NextResponse.json({ error: "solicitacaoId e status (atendida|recusada) são obrigatórios" }, { status: 400 });
    }

    // Confere o vínculo e a permissão da morada (formador comunitário só a própria).
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId: user.organizacaoId, deletedAt: null },
      select: { id: true, grupoFormacaoId: true },
    });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
    if (user.role === "formador_comunitario" && formando.grupoFormacaoId !== user.grupoFormacaoId) {
      return NextResponse.json({ error: "Sem permissão para este formando" }, { status: 403 });
    }

    const result = await prisma.solicitacaoLicencaFormando.updateMany({
      where: { id: body.solicitacaoId, formandoId, organizacaoId: user.organizacaoId, status: "pendente" },
      data: { status: body.status },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Pedido não encontrado ou já tratado." }, { status: 409 });
    }

    logAction(
      "solicitacao_licenca_encaminhada",
      user.id,
      getClientIp(req),
      { solicitacaoId: body.solicitacaoId, formandoId, status: body.status },
      user.organizacaoId,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("formandos/solicitacoes-licenca PATCH", err);
    return NextResponse.json({ error: "Falha ao encaminhar o pedido" }, { status: 500 });
  }
}
