import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { UpdateParticipacaoVocacionalSchema, parseBody } from "@/lib/schemas";
import { isGestao } from "@/lib/auth-helpers";
import { hasCanonicalAccess } from "@/types";
import { lavrarTermo, parseDataLocal, LivroError } from "@/lib/livro-registro";
import { requireVocacionalAccess } from "../../guard";

const TERMINAIS = new Set(["concluida_deferida", "recusada_arquivada", "indeferida_arquivada"]);

const MOTIVO_TERMINO: Record<string, string> = {
  concluida_deferida: "com o deferimento do pedido de ingresso à jornada formativa",
  recusada_arquivada: "por recusa do(a) candidato(a) em prosseguir",
  indeferida_arquivada: "por indeferimento do pedido pelo governo da comunidade",
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireVocacionalAccess({ minPapel: "formador_geral" });
  if ("error" in guard) return guard.error;
  const { user, organizacaoId } = guard.access;
  if (!isGestao(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  try {
    const parsed = parseBody(UpdateParticipacaoVocacionalSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const participacao = await prisma.participacaoVocacional.findFirst({
      where: { id, organizacaoId },
      include: { formando: { select: { id: true, nome: true } }, turma: { select: { nivelFormativo: true } } },
    });
    if (!participacao) return NextResponse.json({ error: "Participação não encontrada" }, { status: 404 });

    // Atualização simples de acompanhador (sem transição terminal)
    if (!body.status || !TERMINAIS.has(body.status)) {
      const updated = await prisma.participacaoVocacional.update({
        where: { id },
        data: {
          ...(body.status ? { status: body.status } : {}),
          ...(body.acompanhadorId !== undefined ? { acompanhadorId: body.acompanhadorId || null } : {}),
        },
      });
      return NextResponse.json(updated);
    }

    const status = body.status;
    const dataConclusao = body.dataConclusao ? parseDataLocal(body.dataConclusao) : new Date();
    const deferida = status === "concluida_deferida";

    const org = await prisma.organizacao.findUnique({
      where: { id: organizacaoId },
      select: { tipoOrganizacao: true },
    });
    const podeAbrirProcesso = deferida && hasCanonicalAccess(org?.tipoOrganizacao);

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await prisma.$transaction(async (tx) => {
          await lavrarTermo(tx, {
            organizacaoId,
            tipo: "termino_vocacional",
            formandoId: participacao.formandoId,
            dataEvento: dataConclusao,
            contexto: {
              formandoNome: participacao.formando.nome,
              dataEvento: dataConclusao,
              motivo: MOTIVO_TERMINO[status],
            },
            criadoPorId: user.id,
            lavradoAutomaticamente: true,
          });

          let processoGeradoId: string | null = null;
          if (podeAbrirProcesso) {
            const processo = await tx.processoEclesiastico.create({
              data: {
                organizacaoId,
                formandoId: participacao.formandoId,
                tipo: "admissao_etapa1",
                nivelFormativo: "pre-discipulado",
                status: "rascunho",
                dadosFormulario: {},
                criadoPorId: user.id!,
              },
            });
            processoGeradoId = processo.id;
          }

          await tx.participacaoVocacional.update({
            where: { id },
            data: { status, dataConclusao, ...(processoGeradoId ? { processoGeradoId } : {}) },
          });

          // Ao encerrar, o formando deixa a turma vocacional. A condição
          // canônica só avança quando o processo de admissão é concluído.
          await tx.formando.update({
            where: { id: participacao.formandoId },
            data: { grupoFormacaoId: null },
          });
        });
        break;
      } catch (e) {
        if (e instanceof LivroError) {
          return NextResponse.json(
            { error: "Abra um tomo do Livro de Registro antes de encerrar a participação." },
            { status: 409 },
          );
        }
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 3) continue;
        throw e;
      }
    }

    logAction(
      deferida ? "vocacional_participacao_concluida" : "vocacional_participacao_arquivada",
      user.id,
      getClientIp(request),
      { participacaoId: id, status },
      organizacaoId,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError("vocacional participacao PATCH", err);
    return NextResponse.json({ error: "Falha ao atualizar participação" }, { status: 500 });
  }
}
