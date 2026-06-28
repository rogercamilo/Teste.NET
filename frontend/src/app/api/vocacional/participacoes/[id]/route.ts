import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { UpdateParticipacaoVocacionalSchema, parseBody } from "@/lib/schemas";
import { isGestao } from "@/lib/auth-helpers";
import { hasCanonicalAccess } from "@/types";
import { lavrarTermo, parseDataLocal, LivroError } from "@/lib/livro-registro";
import { participacaoEncerrada, motivoTermino } from "@/lib/vocacional-rules";
import { requireVocacionalAccess } from "../../guard";

const DESFECHOS_TERMINO = new Set(["concluida_deferida", "recusada_arquivada", "indeferida_arquivada"]);

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
      include: { formando: { select: { id: true, nome: true } } },
    });
    if (!participacao) return NextResponse.json({ error: "Participação não encontrada" }, { status: 404 });

    // Imutabilidade do encerramento: uma participação já encerrada não admite
    // nova transição (evita termo/processo em duplicidade).
    if (participacaoEncerrada(participacao.status)) {
      return NextResponse.json({ error: "Participação já encerrada — não pode ser alterada." }, { status: 409 });
    }

    const status = body.status;

    // ── Atualização simples (acompanhador / transição não-terminal) ────────────
    if (!status || (!DESFECHOS_TERMINO.has(status) && status !== "cancelada")) {
      const updated = await prisma.participacaoVocacional.update({
        where: { id },
        data: {
          ...(status ? { status } : {}),
          ...(body.acompanhadorId !== undefined ? { acompanhadorId: body.acompanhadorId || null } : {}),
        },
      });
      return NextResponse.json(updated);
    }

    const dataConclusao = body.dataConclusao ? parseDataLocal(body.dataConclusao) : new Date();

    // ── Cancelamento administrativo (inscrição lavrada por equívoco) ───────────
    if (status === "cancelada") {
      // Mais restritivo: anular um assento cartorial é ato de administrador.
      if (user.role !== "administrador") {
        return NextResponse.json({ error: "Apenas o administrador pode cancelar uma inscrição." }, { status: 403 });
      }
      // Número do termo de ingresso original, para referência na retificação.
      const termoIngresso = participacao.termoIngressoId
        ? await prisma.termoRegistro.findUnique({ where: { id: participacao.termoIngressoId }, select: { numero: true } })
        : null;

      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await prisma.$transaction(async (tx) => {
            await lavrarTermo(tx, {
              organizacaoId,
              tipo: "retificacao",
              formandoId: participacao.formandoId,
              dataEvento: dataConclusao,
              contexto: {
                formandoNome: participacao.formando.nome,
                dataEvento: dataConclusao,
                retificaTermoNumero: termoIngresso?.numero,
                retificaDescricao: "para cancelar o assento de ingresso no Período Vocacional, lavrado por equívoco administrativo",
              },
              retificaTermoId: participacao.termoIngressoId,
              criadoPorId: user.id,
              lavradoAutomaticamente: false,
            });
            await tx.participacaoVocacional.update({ where: { id }, data: { status: "cancelada", dataConclusao } });
            // Reverte o pré-estado capturado na inscrição.
            await tx.formando.update({
              where: { id: participacao.formandoId },
              data: { grupoFormacaoId: participacao.grupoOrigemId, condicaoAtual: participacao.condicaoOrigem },
            });
          });
          break;
        } catch (e) {
          if (e instanceof LivroError) {
            return NextResponse.json({ error: "Abra um tomo do Livro de Registro antes de cancelar a inscrição." }, { status: 409 });
          }
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 3) continue;
          throw e;
        }
      }
      logAction("vocacional_participacao_arquivada", user.id, getClientIp(request), { participacaoId: id, status: "cancelada" }, organizacaoId);
      return NextResponse.json({ ok: true });
    }

    // ── Encerramento por desfecho (deferida / recusa / indeferimento) ──────────
    const deferida = status === "concluida_deferida";
    const org = await prisma.organizacao.findUnique({ where: { id: organizacaoId }, select: { tipoOrganizacao: true } });
    const podeAbrirProcesso = deferida && hasCanonicalAccess(org?.tipoOrganizacao);

    // Reversão não-destrutiva: o formando volta ao grupo de origem (em vez de
    // ficar órfão). Na recusa/indeferimento também restaura a condição anterior;
    // na deferida a condição segue "candidato" até o processo de admissão concluir.
    const formandoRestore = deferida
      ? { grupoFormacaoId: participacao.grupoOrigemId }
      : { grupoFormacaoId: participacao.grupoOrigemId, condicaoAtual: participacao.condicaoOrigem };

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await prisma.$transaction(async (tx) => {
          await lavrarTermo(tx, {
            organizacaoId,
            tipo: "termino_vocacional",
            formandoId: participacao.formandoId,
            dataEvento: dataConclusao,
            contexto: { formandoNome: participacao.formando.nome, dataEvento: dataConclusao, motivo: motivoTermino(status) },
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
          await tx.formando.update({ where: { id: participacao.formandoId }, data: formandoRestore });
        });
        break;
      } catch (e) {
        if (e instanceof LivroError) {
          return NextResponse.json({ error: "Abra um tomo do Livro de Registro antes de encerrar a participação." }, { status: 409 });
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
