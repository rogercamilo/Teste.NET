import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { SessionUser as SU } from "@/lib/auth-helpers";
import { toPresenca } from "@/lib/converters";
import { BulkPresencaSchema, parseJson } from "@/lib/schemas";

// Chamada em lote de uma sessão: recebe várias marcações e as grava numa
// transação única (evita N requests do cliente, que estouram o rate-limit).
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, BulkPresencaSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { agendamentoId, marcacoes } = parsed.data;

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: agendamentoId, organizacaoId: user.organizacaoId, deletedAt: null },
    });
    if (!agendamento) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });

    // Escopo: FC só marca formandos da própria morada. Busca só os formandos das
    // marcações que pertencem ao tenant (e à morada, se FC) — ignora ids fora do escopo.
    const grupoFilter = user.role === "formador_comunitario" ? { grupoFormacaoId: user.grupoFormacaoId ?? null } : {};
    const ids = marcacoes.map((m) => m.formandoId);
    const formandos = await prisma.formando.findMany({
      where: { id: { in: ids }, organizacaoId: user.organizacaoId, deletedAt: null, ...grupoFilter },
      select: { id: true, nome: true, nivelFormativo: true },
    });
    const formandoById = new Map(formandos.map((f) => [f.id, f]));

    const validas = marcacoes.filter((m) => formandoById.has(m.formandoId));
    if (validas.length === 0) return NextResponse.json({ error: "Nenhum formando válido" }, { status: 400 });

    const ops = validas.map((m) => {
      const f = formandoById.get(m.formandoId)!;
      const presente = m.status === "presente";
      const justificativa = m.status === "justificado" ? (m.justificativa || null) : null;
      return prisma.presencaFormacao.upsert({
        where: { agendamentoId_formandoId: { agendamentoId, formandoId: m.formandoId } },
        create: {
          organizacaoId: user.organizacaoId!,
          agendamentoId,
          formacaoTema: agendamento.formacaoTema,
          data: agendamento.dataInicio,
          formandoId: m.formandoId,
          formandoNome: f.nome,
          nivelFormativo: f.nivelFormativo,
          presente,
          statusFormador: m.status,
          justificativa,
        },
        update: { presente, statusFormador: m.status, justificativa },
      });
    });

    const rows = await prisma.$transaction(ops);
    logAction("presenca_lote_registrada", user.id, getClientIp(request), { agendamentoId, total: rows.length }, user.organizacaoId);
    return NextResponse.json(rows.map(toPresenca), { status: 200 });
  } catch (err) {
    logError("presencas/bulk", err);
    return NextResponse.json({ error: "Falha ao salvar a chamada" }, { status: 500 });
  }
}
