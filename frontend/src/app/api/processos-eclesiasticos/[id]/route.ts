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
  documentosProntosParaRevisao,
} from "@/lib/jornada-vocacional";
import { criarNotificacao, criarNotificacoes, formadorDoGrupo, revisoresDaOrg } from "@/lib/notificacoes";
import { lavrarTermo, mapProcessoParaTermo, LivroError, parseDataLocal } from "@/lib/livro-registro";
import {
  mapProcessoParaTipoPromessa,
  montarFormulaPromessa,
  montarRefPromessa,
  lavrarRegistroPromessa,
  type LavrarRegistroPromessaParams,
} from "@/lib/livro-promessas";
import { lavrarComRetry } from "@/lib/livro-retry";

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
            grupoFormacaoId: true,
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
        promessa: true,
      },
    });

    if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

    // Formador comunitário só lê processos de formandos da sua morada.
    if (user.role === "formador_comunitario" && processo.formando.grupoFormacaoId !== user.grupoFormacaoId) {
      return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      id: processo.id,
      organizacaoId: processo.organizacaoId,
      formandoId: processo.formandoId,
      formando: {
        id: processo.formando.id,
        nome: processo.formando.nome,
        dataNascimento: processo.formando.dataNascimento?.toISOString() ?? null,
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
      motivoDevolucao: processo.motivoDevolucao,
      devolvidoEm: processo.devolvidoEm?.toISOString() ?? null,
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
      promessa: processo.promessa
        ? {
            id: processo.promessa.id,
            tipo: processo.promessa.tipo,
            tomo: processo.promessa.tomo,
            folha: processo.promessa.folha,
            numero: processo.promessa.numero,
            numeroRegistro: processo.promessa.numeroRegistro,
            dataVigenciaInicio: processo.promessa.dataVigenciaInicio.toISOString(),
            dataVigenciaFim: processo.promessa.dataVigenciaFim?.toISOString() ?? null,
            celebrante: processo.promessa.celebrante,
            localCelebracao: processo.promessa.localCelebracao,
            moderadorGeral: processo.promessa.moderadorGeral,
            formadorGeralLocal: processo.promessa.formadorGeralLocal,
            assistenteEclesiastico: processo.promessa.assistenteEclesiastico,
            secretario: processo.promessa.secretario,
            formulaTexto: processo.promessa.formulaTexto,
          }
        : null,
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
        documentos: { select: { id: true, arquivoId: true } },
        organizacao: { select: { nome: true, termoPreDiscipulado: true, termoDiscipulado: true, termoPrimeirasPromessas: true, termoFormacaoPermanente: true } },
        promessa: { select: { id: true, tomo: true, folha: true, numeroRegistro: true } },
      },
    });
    if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

    // Formador comunitário só atua sobre processos de formandos da sua morada.
    if (user.role === "formador_comunitario" && processo.formando.grupoFormacaoId !== user.grupoFormacaoId) {
      return NextResponse.json({ error: "Sem permissão para este processo" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({})) as {
      dadosFormulario?: Record<string, unknown>;
      status?: StatusProcessoEclesiastico;
      motivo?: string;
      favoravelRenovacao?: boolean;
      promessa?: {
        dataCelebracao?: string;
        localCelebracao?: string;
        celebrante?: string;
        moderadorGeral?: string;
        formadorGeralLocal?: string;
        assistenteEclesiastico?: string;
        secretario?: string;
        formulaTexto?: string;
        periodoVigencia?: string;
        dataVigenciaInicio?: string;
        dataVigenciaFim?: string;
      };
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

      const ehDevolucao = transicaoValida.para === "em_andamento" && processo.status === "em_revisao";

      // Trava: só envia para revisão com todos os documentos canônicos gerados.
      if (transicaoValida.exigeDocumentosGerados && !documentosProntosParaRevisao(processo.documentos)) {
        return NextResponse.json(
          { error: "Gere todos os documentos do processo antes de enviar para revisão." },
          { status: 422 }
        );
      }

      // Devolução para ajustes exige um motivo, que retorna ao preparador.
      const motivoDevolucao = body.motivo?.trim();
      if (ehDevolucao && !motivoDevolucao) {
        return NextResponse.json(
          { error: "Informe o motivo da devolução para o preparador saber o que ajustar." },
          { status: 422 }
        );
      }

      // Devolução (em_revisao → em_andamento): volta ao preparador com o motivo.
      if (ehDevolucao) {
        const result = await prisma.processoEclesiastico.updateMany({
          where: { id, status: processo.status, organizacaoId },
          data: { status: "em_andamento", motivoDevolucao, devolvidoEm: new Date() },
        });
        if (result.count === 0) {
          return NextResponse.json(
            { error: "Status alterado por outra operação. Recarregue e tente novamente." },
            { status: 409 }
          );
        }
        logAction("processo_eclesiastico_devolvido", user.id, getClientIp(req), { id }, user.organizacaoId);
        if (processo.formando.grupoFormacaoId) {
          try {
            const fcId = await formadorDoGrupo(processo.formando.grupoFormacaoId);
            if (fcId) {
              await criarNotificacao({
                organizacaoId,
                destinatarioId: fcId,
                tipo: "processo_devolvido",
                titulo: `Processo de ${processo.formando.nome} devolvido para ajustes`,
                corpo: `Ajuste solicitado pela revisão: ${motivoDevolucao}. Corrija e reenvie para revisão.`,
                linkAcao: `/jornada-vocacional/${id}`,
              });
            }
          } catch (err) {
            logError("processos-eclesiasticos:notificacoes", err);
          }
        }
        return NextResponse.json({ id, status: "em_andamento" });
      }

      // Ao iniciar processo (rascunho → em_andamento): inicializa DocumentoEclesiastico se ainda não existem
      if (transicaoValida.para === "em_andamento") {
        // A data de nascimento define se há trâmite de menor de idade e alimenta
        // os documentos canônicos — exigida para iniciar o processo.
        if (!processo.formando.dataNascimento) {
          return NextResponse.json(
            { error: "Complete a data de nascimento do formando (no cadastro ou pelo portal) antes de iniciar o processo." },
            { status: 422 }
          );
        }
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
        const mapeamento = mapProcessoParaTermo(processo.tipo, processo.nivelFormativo);
        const dados = (processo.dadosFormulario as Record<string, unknown>) ?? {};
        const str = (k: string) => (typeof dados[k] === "string" ? (dados[k] as string) : undefined);
        const num = (k: string) => (typeof dados[k] === "number" ? (dados[k] as number) : undefined);

        // Processos de promessa lavram, na mesma conclusão, o assento no Livro de
        // Promessas (rito separado). O termo do Livro Geral apenas o referencia.
        const tipoPromessa = mapProcessoParaTipoPromessa(processo.tipo);
        let dadosPromessa: LavrarRegistroPromessaParams | null = null;
        if (tipoPromessa && !processo.promessa) {
          const p = body.promessa;
          const faltando =
            !p?.celebrante?.trim() ||
            !p?.localCelebracao?.trim() ||
            !p?.moderadorGeral?.trim() ||
            !p?.secretario?.trim();
          if (!p || faltando) {
            return NextResponse.json(
              { error: "Dados da celebração são obrigatórios para lavrar o registro no Livro de Promessas." },
              { status: 400 }
            );
          }
          const dataCelebracao = p.dataCelebracao ? parseDataLocal(p.dataCelebracao) : new Date();
          const dataVigInicio = p.dataVigenciaInicio ? parseDataLocal(p.dataVigenciaInicio) : dataCelebracao;
          const dataVigFim =
            tipoPromessa === "definitivas"
              ? null
              : p.dataVigenciaFim
                ? parseDataLocal(p.dataVigenciaFim)
                : null;
          const formulaTexto =
            p.formulaTexto?.trim() ||
            montarFormulaPromessa({
              formandoNome: processo.formando.nome,
              orgNome: processo.organizacao.nome,
              tipo: tipoPromessa,
              periodoVigencia: p.periodoVigencia,
            });
          dadosPromessa = {
            organizacaoId,
            formandoId: processo.formandoId,
            processoId: processo.id,
            tipo: tipoPromessa,
            dataVigenciaInicio: dataVigInicio,
            dataVigenciaFim: dataVigFim,
            formulaTexto,
            celebrante: p.celebrante!.trim(),
            localCelebracao: p.localCelebracao!.trim(),
            moderadorGeral: p.moderadorGeral!.trim(),
            formadorGeralLocal: p.formadorGeralLocal?.trim() || null,
            assistenteEclesiastico: p.assistenteEclesiastico?.trim() || null,
            secretario: p.secretario!.trim(),
            criadoPorId: user.id,
          };
        }

        let promessaLavrada = false;
        try {
          await lavrarComRetry(async (tx) => {
            const result = await tx.processoEclesiastico.updateMany({
              where: { id, status: processo.status, organizacaoId },
              data: { status: body.status },
            });
            if (result.count === 0) throw new Error("CONCURRENT_MODIFICATION");

            // Lavra o assento no Livro de Promessas antes do termo referencial.
            let promessaRef: string | undefined;
            let registroPromessaId: string | null = processo.promessa?.id ?? null;
            if (dadosPromessa) {
              const reg = await lavrarRegistroPromessa(tx, dadosPromessa);
              promessaRef = montarRefPromessa(reg);
              registroPromessaId = reg.id;
              promessaLavrada = true;
            } else if (processo.promessa) {
              promessaRef = montarRefPromessa(processo.promessa);
            }

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
                registroPromessaId,
                criadoPorId: user.id,
                contexto: {
                  formandoNome: processo.formando.nome,
                  dataEvento: new Date(),
                  etapaNome,
                  processoCodigo: processo.id.slice(-6).toUpperCase(),
                  promessaRef,
                  numeroRenovacao: processo.numeroRenovacao ?? undefined,
                  vigenciaFim: dadosPromessa?.dataVigenciaFim
                    ?? (str("dataFimVigencia") ? parseDataLocal(str("dataFimVigencia")!) : undefined),
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
        if (promessaLavrada) {
          logAction("promessa_registrada", user.id, getClientIp(req), { id, tipo: tipoPromessa }, user.organizacaoId);
        }
      } else {
        const result = await prisma.processoEclesiastico.updateMany({
          where: { id, status: processo.status, organizacaoId },
          // Ao (re)enviar para revisão, limpa a marca de devolução anterior.
          data: {
            status: body.status,
            ...(body.status === "em_revisao" ? { motivoDevolucao: null, devolvidoEm: null } : {}),
          },
        });
        if (result.count === 0) {
          return NextResponse.json(
            { error: "Status alterado por outra operação. Recarregue e tente novamente." },
            { status: 409 }
          );
        }
      }

      logAction("processo_eclesiastico_atualizado", user.id, getClientIp(req), { id, status: body.status }, user.organizacaoId);

      // Mensageria entre perfis: cada handoff avisa quem passa a ser responsável.
      // Aguardado de propósito — em route handler, promessa não-aguardada pode não
      // executar após o `return`, e a notificação simplesmente não chega. Falha
      // aqui não deve derrubar a transição (try/catch abaixo).
      const linkAcao = `/jornada-vocacional/${id}`;
      try {
        // Iniciado (rascunho → em_andamento; devolução já retornou antes) → avisa o
        // formador do grupo que há um processo para preparar, se não for ele o ator.
        if (body.status === "em_andamento" && processo.formando.grupoFormacaoId) {
          const fcId = await formadorDoGrupo(processo.formando.grupoFormacaoId);
          if (fcId && fcId !== user.id) {
            await criarNotificacao({
              organizacaoId,
              destinatarioId: fcId,
              tipo: "processo_iniciado",
              titulo: `Novo processo de ${processo.formando.nome} para preparar`,
              corpo: "Preencha o formulário e gere os documentos; depois envie para revisão.",
              linkAcao,
            });
          }
        }

        // Entrou em revisão → avisa os revisores (Formadores Gerais) que há ação para eles.
        if (body.status === "em_revisao") {
          const ids = await revisoresDaOrg(organizacaoId);
          // Remove o remetente para não notificar a si mesmo; mas se ele for o
          // ÚNICO revisor (org com um só FG), mantém o sinal em vez de zerar.
          let destinatarios = ids.filter((rid) => rid !== user.id);
          if (destinatarios.length === 0) destinatarios = ids;
          await criarNotificacoes(destinatarios.map((destinatarioId) => ({
            organizacaoId,
            destinatarioId,
            tipo: "processo_em_revisao" as const,
            titulo: `Processo de ${processo.formando.nome} aguarda sua revisão`,
            corpo: "Confira os documentos e valide: aprove ou devolva para ajustes.",
            linkAcao,
          })));
        }

        // Aprovado → informa o preparador (FC) que o processo passou na revisão.
        if (body.status === "aprovado" && processo.formando.grupoFormacaoId) {
          const fcId = await formadorDoGrupo(processo.formando.grupoFormacaoId);
          if (fcId) {
            await criarNotificacao({
              organizacaoId,
              destinatarioId: fcId,
              tipo: "processo_aprovado",
              titulo: `Processo de ${processo.formando.nome} aprovado`,
              corpo: "O processo foi aprovado na revisão. A gestão fará a conclusão e a oficialização.",
              linkAcao,
            });
          }
        }

        // Concluído → informa o preparador (FC) que os documentos oficiais estão disponíveis.
        if (body.status === "concluido" && processo.formando.grupoFormacaoId) {
          const fcId = await formadorDoGrupo(processo.formando.grupoFormacaoId);
          if (fcId) {
            await criarNotificacao({
              organizacaoId,
              destinatarioId: fcId,
              tipo: "processo_concluido",
              titulo: `Processo de ${processo.formando.nome} concluído`,
              corpo: "O processo foi concluído e os documentos oficiais estão disponíveis na aba Documentos.",
              linkAcao,
            });
          }
        }
      } catch (err) {
        logError("processos-eclesiasticos:notificacoes", err);
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
