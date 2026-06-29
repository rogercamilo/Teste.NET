import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { SessionUser } from "@/lib/auth-helpers";
import type { StatusProcessoEclesiastico } from "@/types";
import {
  getTransicoesDisponiveis,
  podeEditarFormulario,
  getDocumentosTipos,
  eraMenorDeIdade,
} from "@/lib/jornada-vocacional";
import { criarNotificacao, formadorDoGrupo } from "@/lib/notificacoes";
import { lavrarTermo, mapProcessoParaTermo, LivroError, parseDataLocal } from "@/lib/livro-registro";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await params;
    const processo = await prisma.processoEclesiastico.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
      include: {
        formando: {
          select: {
            id: true,
            nome: true,
            dataNascimento: true,
            estadoCivil: true,
            telefone: true,
            email: true,
            nomeSocial: true,
            nacionalidade: true,
            rg: true,
            orgaoEmissor: true,
            cep: true,
            paroquiaReferencia: true,
            numFilhos: true,
          },
        },
        criadoPor: { select: { id: true, nome: true } },
        documentos: {
          orderBy: { criadoEm: "asc" },
        },
      },
    });

    if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

    return NextResponse.json({
      id: processo.id,
      organizacaoId: processo.organizacaoId,
      formandoId: processo.formandoId,
      formando: {
        id: processo.formando.id,
        nome: processo.formando.nome,
        dataNascimento: processo.formando.dataNascimento.toISOString(),
        estadoCivil: processo.formando.estadoCivil,
        telefone: processo.formando.telefone,
        email: processo.formando.email,
        nomeSocial: processo.formando.nomeSocial,
        nacionalidade: processo.formando.nacionalidade,
        rg: processo.formando.rg,
        orgaoEmissor: processo.formando.orgaoEmissor,
        cep: processo.formando.cep,
        paroquiaReferencia: processo.formando.paroquiaReferencia,
        numFilhos: processo.formando.numFilhos,
      },
      tipo: processo.tipo,
      nivelFormativo: processo.nivelFormativo,
      status: processo.status,
      dadosFormulario: processo.dadosFormulario,
      favoravelRenovacao: processo.favoravelRenovacao,
      numeroRenovacao: processo.numeroRenovacao,
      criadoPorId: processo.criadoPorId,
      criadoPorNome: processo.criadoPor.nome,
      criadoEm: processo.criadoEm.toISOString(),
      atualizadoEm: processo.atualizadoEm.toISOString(),
      documentos: processo.documentos.map((d) => ({
        id: d.id,
        processoId: d.processoId,
        tipo: d.tipo,
        status: d.status,
        versao: d.versao,
        arquivoId: d.arquivoId,
        geradoEm: d.geradoEm?.toISOString() ?? null,
        geradoPorId: d.geradoPorId,
        observacoes: d.observacoes,
        criadoEm: d.criadoEm.toISOString(),
      })),
    });
  } catch (err) {
    logError("processos-eclesiasticos", err);
    return NextResponse.json({ error: "Falha ao carregar processo" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { organizacaoId } = user;

  try {
    const { id } = await params;
    const processo = await prisma.processoEclesiastico.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
      include: {
        formando: { select: { id: true, nome: true, dataNascimento: true, grupoFormacaoId: true } },
        documentos: { select: { id: true } },
        organizacao: { select: { termoPreDiscipulado: true, termoDiscipulado: true } },
        promessa: { select: { id: true, tomo: true, folha: true, numeroRegistro: true } },
      },
    });
    if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

    const body = await req.json().catch(() => ({})) as {
      dadosFormulario?: Record<string, unknown>;
      status?: StatusProcessoEclesiastico;
      favoravelRenovacao?: boolean;
    };

    // Atualização de formulário
    if (body.dadosFormulario !== undefined) {
      if (!podeEditarFormulario(processo.status, user.role ?? "")) {
        return NextResponse.json({ error: "Processo não pode ser editado neste status" }, { status: 403 });
      }

      const updated = await prisma.processoEclesiastico.update({
        where: { id },
        data: {
          dadosFormulario: body.dadosFormulario as import("@prisma/client").Prisma.InputJsonValue,
          ...(body.favoravelRenovacao !== undefined && { favoravelRenovacao: body.favoravelRenovacao }),
        },
      });

      logAction("processo_eclesiastico_atualizado", user.id, getClientIp(req), { id }, user.organizacaoId);
      return NextResponse.json({ id: updated.id, status: updated.status, atualizadoEm: updated.atualizadoEm.toISOString() });
    }

    // Transição de status
    if (body.status !== undefined) {
      const transicoes = getTransicoesDisponiveis(processo.status, user.role ?? "");
      const transicaoValida = transicoes.find((t) => t.para === body.status);

      if (!transicaoValida) {
        return NextResponse.json(
          { error: `Transição de '${processo.status}' para '${body.status}' não permitida para o seu perfil` },
          { status: 403 }
        );
      }

      // Ao iniciar processo (rascunho → em_andamento): inicializa DocumentoEclesiastico se ainda não existem
      if (transicaoValida.para === "em_andamento") {
        const menorDeIdade = eraMenorDeIdade(
          processo.formando.dataNascimento,
          processo.criadoEm
        );
        const tiposDoc = getDocumentosTipos(processo.tipo, {
          menorDeIdade,
          favoravelRenovacao: processo.favoravelRenovacao ?? false,
        });
        await prisma.$transaction(async (tx) => {
          const current = await tx.processoEclesiastico.findFirst({
            where: { id, organizacaoId },
            select: { status: true, documentos: { select: { id: true } } },
          });
          if (!current || current.status !== processo.status) {
            throw new Error("CONCURRENT_MODIFICATION");
          }
          await tx.processoEclesiastico.update({ where: { id }, data: { status: body.status } });
          if (current.documentos.length === 0) {
            for (const tipo of tiposDoc) {
              await tx.documentoEclesiastico.create({
                data: { processoId: id, tipo, status: "pendente" },
              });
            }
          }
        });
      } else if (transicaoValida.para === "concluido") {
        // Ao concluir, lavra automaticamente o termo correspondente no Livro de
        // Registro. Se o tipo de processo não gera termo, apenas muda o status.
        const mapeamento = mapProcessoParaTermo(processo.tipo);
        const dados = (processo.dadosFormulario as Record<string, unknown>) ?? {};
        const str = (k: string) => (typeof dados[k] === "string" ? (dados[k] as string) : undefined);
        const num = (k: string) => (typeof dados[k] === "number" ? (dados[k] as number) : undefined);
        const promessaRef = processo.promessa
          ? `Livro de Promessas, Tomo ${processo.promessa.tomo}, Folha ${String(processo.promessa.folha).padStart(3, "0")}, Registro nº ${processo.promessa.numeroRegistro}`
          : undefined;

        try {
          await prisma.$transaction(async (tx) => {
            const result = await tx.processoEclesiastico.updateMany({
              where: { id, status: processo.status, organizacaoId },
              data: { status: body.status },
            });
            if (result.count === 0) throw new Error("CONCURRENT_MODIFICATION");

            if (mapeamento) {
              const etapaNome = mapeamento.etapaCampo
                ? processo.organizacao[mapeamento.etapaCampo]
                : undefined;
              await lavrarTermo(tx, {
                organizacaoId,
                tipo: mapeamento.tipoTermo,
                formandoId: processo.formandoId,
                dataEvento: new Date(),
                condicaoResultante: mapeamento.condicaoResultante,
                processoId: processo.id,
                registroPromessaId: processo.promessa?.id ?? null,
                criadoPorId: user.id,
                contexto: {
                  formandoNome: processo.formando.nome,
                  dataEvento: new Date(),
                  etapaNome,
                  processoCodigo: processo.id.slice(-6).toUpperCase(),
                  promessaRef,
                  numeroRenovacao: processo.numeroRenovacao ?? undefined,
                  vigenciaFim: str("dataFimVigencia") ? parseDataLocal(str("dataFimVigencia")!) : undefined,
                  ministerioNome: str("ministerio") ?? str("cargoFuncao"),
                  destino: str("destino") ?? str("nucleoDestino"),
                  motivo: str("motivo"),
                  prazoMeses: num("prazoMeses"),
                },
              });
            }
          });
        } catch (err) {
          if (err instanceof LivroError) {
            return NextResponse.json({ error: err.message }, { status: 409 });
          }
          if (err instanceof Error && err.message === "CONCURRENT_MODIFICATION") {
            return NextResponse.json(
              { error: "Status alterado por outra operação. Recarregue e tente novamente." },
              { status: 409 }
            );
          }
          throw err;
        }

        logAction("processo_eclesiastico_concluido", user.id, getClientIp(req), { id }, user.organizacaoId);
      } else {
        const result = await prisma.processoEclesiastico.updateMany({
          where: { id, status: processo.status, organizacaoId },
          data: { status: body.status },
        });
        if (result.count === 0) {
          return NextResponse.json(
            { error: "Status alterado por outra operação. Recarregue e tente novamente." },
            { status: 409 }
          );
        }
      }

      logAction("processo_eclesiastico_atualizado", user.id, getClientIp(req), { id, status: body.status }, user.organizacaoId);

      // Notifica FC quando processo é aprovado
      if (body.status === "aprovado" && processo.formando.grupoFormacaoId) {
        formadorDoGrupo(processo.formando.grupoFormacaoId).then((fcId) => {
          if (!fcId) return;
          criarNotificacao({
            organizacaoId,
            destinatarioId: fcId,
            tipo: "processo_aprovado",
            titulo: `Processo de ${processo.formando.nome} aprovado`,
            corpo: "O processo eclesiástico foi aprovado e os documentos estão disponíveis para geração.",
            linkAcao: `/jornada-vocacional/${id}`,
          });
        }).catch(() => {});
      }

      return NextResponse.json({ id, status: body.status });
    }

    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  } catch (err) {
    if (err instanceof Error && err.message === "CONCURRENT_MODIFICATION") {
      return NextResponse.json(
        { error: "Status alterado por outra operação. Recarregue e tente novamente." },
        { status: 409 }
      );
    }
    logError("processos-eclesiasticos", err);
    return NextResponse.json({ error: "Falha ao atualizar processo" }, { status: 500 });
  }
}
