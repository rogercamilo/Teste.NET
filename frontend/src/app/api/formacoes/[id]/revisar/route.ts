import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";
import { getUserName } from "@/lib/current-user";
import { podeElaborarConteudo, SessionUser as SU } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

/**
 * Marca/desmarca a formação como REVISADA (revisão editorial). `revisadoEm` nulo
 * = ainda não revisada. Alimenta o indicador "não revisadas" do dashboard do
 * Formador Pedagógico. Não altera conteúdo — só o carimbo de revisão.
 */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!podeElaborarConteudo(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const revisado = body?.revisado !== false; // default: marcar como revisada

  // Conteúdo global não pertence ao tenant — só a própria formação da org é revisável.
  const formacao = await prisma.formacao.findFirst({
    where: { id, organizacaoId: user.organizacaoId, deletedAt: null },
    select: { id: true },
  });
  if (!formacao) return NextResponse.json({ error: "Formação não encontrada" }, { status: 404 });

  const revisadoPor = revisado ? (await getUserName(user.id)) ?? null : null;
  const updated = await prisma.formacao.update({
    where: { id },
    data: { revisadoEm: revisado ? new Date() : null, revisadoPor },
    select: { id: true, revisadoEm: true, revisadoPor: true },
  });

  logAction("formacao_revised", user.id, getClientIp(request), { formacaoId: id, revisado }, user.organizacaoId);
  return NextResponse.json(updated);
}
