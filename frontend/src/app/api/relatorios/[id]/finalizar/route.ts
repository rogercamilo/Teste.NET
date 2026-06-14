import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { toRelatorio } from "@/lib/converters";
import type { SessionUser as SU } from "@/lib/auth-helpers";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const { id } = await params;
    const row = await prisma.relatorioEtapa.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    if (row.status === "finalizado") {
      return NextResponse.json({ error: "Relatório já está finalizado" }, { status: 400 });
    }

    if (user.role === "formador_comunitario" && row.formadorId !== user.id) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    if (!row.recomendacao) {
      return NextResponse.json({ error: "Informe a recomendação antes de finalizar" }, { status: 400 });
    }

    const updated = await prisma.relatorioEtapa.update({
      where: { id },
      data: { status: "finalizado" },
    });

    logAction("relatorio_finalizado", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toRelatorio(updated));
  } catch (err) {
    logError("relatorios", err);
    return NextResponse.json({ error: "Falha ao finalizar relatório" }, { status: 500 });
  }
}
