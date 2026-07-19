import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { CreateAcompanhamentoFormandoSchema, isValidId, parseJson } from "@/lib/schemas";
import { parseDataLocal } from "@/lib/livro-registro";
import { SessionUser as SU } from "@/lib/auth-helpers";

type Params = { params: Promise<{ id: string }> };

/**
 * Acompanhamento formativo do FORMANDO (não vocacional). A `nota` do formador é
 * PRIVADA ao formador — nunca sai por rota de portal. O escopo segue o mesmo
 * critério da ficha: org sempre; formador_comunitario limitado ao seu grupo.
 */
async function autorizarFormando(user: SU, id: string) {
  const where: Record<string, unknown> = { id, organizacaoId: user.organizacaoId, deletedAt: null };
  if (user.role === "formador_comunitario") where.grupoFormacaoId = user.grupoFormacaoId ?? null;
  return prisma.formando.findFirst({ where, select: { id: true } });
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const formando = await autorizarFormando(user, id);
    if (!formando) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const [acompanhamentos, solicitacoesPendentes] = await Promise.all([
      prisma.acompanhamentoFormando.findMany({
        where: { formandoId: id, organizacaoId: user.organizacaoId },
        orderBy: { data: "desc" },
        include: { formador: { select: { nome: true } } },
      }),
      prisma.solicitacaoAcompanhamentoFormando.findMany({
        where: { formandoId: id, organizacaoId: user.organizacaoId, status: "pendente" },
        orderBy: { solicitadoEm: "desc" },
      }),
    ]);

    return NextResponse.json({
      acompanhamentos: acompanhamentos.map((a) => ({
        id: a.id,
        data: a.data.toISOString(),
        nota: a.nota,
        formadorNome: a.formador.nome,
        solicitadoPeloFormando: a.solicitadoPeloFormando,
        criadoEm: a.criadoEm.toISOString(),
      })),
      solicitacoesPendentes: solicitacoesPendentes.map((s) => ({
        id: s.id,
        solicitadoEm: s.solicitadoEm.toISOString(),
        mensagem: s.mensagem,
      })),
    });
  } catch (err) {
    logError("formando acompanhamentos GET", err);
    return NextResponse.json({ error: "Falha ao carregar acompanhamentos" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const formando = await autorizarFormando(user, id);
    if (!formando) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const parsed = await parseJson(request, CreateAcompanhamentoFormandoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { data, nota, atendeSolicitacaoId } = parsed.data;

    // Se o encontro atende a um pedido do formando, marca a solicitação como
    // agendada (escopada ao formando+org — nunca confia no id cru: anti-IDOR).
    const atendeSolicitacao = atendeSolicitacaoId
      ? await prisma.solicitacaoAcompanhamentoFormando.findFirst({
          where: { id: atendeSolicitacaoId, formandoId: id, organizacaoId: user.organizacaoId, status: "pendente" },
          select: { id: true },
        })
      : null;

    const acompanhamento = await prisma.$transaction(async (tx) => {
      const criado = await tx.acompanhamentoFormando.create({
        data: {
          organizacaoId: user.organizacaoId!,
          formandoId: id,
          formadorId: user.id!,
          data: parseDataLocal(data),
          nota: nota?.trim() || null,
          solicitadoPeloFormando: !!atendeSolicitacao,
        },
      });
      if (atendeSolicitacao) {
        await tx.solicitacaoAcompanhamentoFormando.update({
          where: { id: atendeSolicitacao.id },
          data: { status: "agendada" },
        });
      }
      return criado;
    });

    logAction("acompanhamento_formando_registrado", user.id, getClientIp(request), { formandoId: id, acompanhamentoId: acompanhamento.id }, user.organizacaoId);
    return NextResponse.json({ id: acompanhamento.id }, { status: 201 });
  } catch (err) {
    logError("formando acompanhamentos POST", err);
    return NextResponse.json({ error: "Falha ao registrar acompanhamento" }, { status: 500 });
  }
}
