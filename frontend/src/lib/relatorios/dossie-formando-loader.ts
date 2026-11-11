/**
 * Carregador do dossiê do formando (server-only) — ponte entre o banco e o motor
 * puro `montarDossieFormando`. Lê as MESMAS tabelas da ficha, escopadas por
 * organização e formando, e devolve o dossiê consolidado da etapa atual.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type { EstadoCivil, NivelFormativo, ProgressoEtapa } from "@/types";
import {
  montarDossieFormando,
  type DossieFormando,
  type EventoDossie,
  type EvidenciaParecer,
  type PresencaDossie,
} from "./dossie-formando";

export interface DossieComContexto {
  dossie: DossieFormando;
  formando: { id: string; nome: string; nivelFormativo: NivelFormativo; grupoFormacaoId: string | null };
}

/**
 * Carrega o dossiê de um formando. Retorna `null` se o formando não existir na
 * organização. A checagem de papel (FC da própria morada vs. gestão) é feita no
 * endpoint, com o `grupoFormacaoId` devolvido aqui.
 */
export async function carregarDossieFormando(
  organizacaoId: string,
  formandoId: string
): Promise<DossieComContexto | null> {
  const formando = await prisma.formando.findFirst({
    where: { id: formandoId, organizacaoId, deletedAt: null },
    include: { progressoEtapas: true },
  });
  if (!formando) return null;

  const [presencasRows, acompanhamentos, eventosRows, comentarios, org] = await Promise.all([
    prisma.presencaFormacao.findMany({
      where: { formandoId, organizacaoId },
      select: { formandoId: true, agendamentoId: true, data: true, presente: true, statusFormador: true, nivelFormativo: true },
    }),
    prisma.acompanhamentoFormando.findMany({
      where: { formandoId, organizacaoId },
      select: { data: true },
    }),
    prisma.eventoFormando.findMany({
      where: { formandoId, organizacaoId },
      select: {
        tipo: true, perspectiva: true, notaAdesao: true, textoAvaliacao: true,
        dataInicioLicenca: true, dataFimLicenca: true, motivo: true, criadoEm: true,
      },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.comentarioFormando.findMany({
      where: { formandoId, organizacaoId, tipo: "adesao" },
      select: { texto: true, criadoEm: true },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.organizacao.findUnique({
      where: { id: organizacaoId },
      select: { cadenciaAcompanhamentoMeses: true },
    }),
  ]);

  // tipoEvento por agendamento (categorização da presença) — só os referenciados.
  const agendamentoIds = [...new Set(presencasRows.map((p) => p.agendamentoId))];
  const agendamentos = agendamentoIds.length
    ? await prisma.agendamento.findMany({
        where: { id: { in: agendamentoIds }, organizacaoId },
        select: { id: true, tipoEvento: true },
      })
    : [];
  const tipoEventoPorAgendamento = new Map(agendamentos.map((a) => [a.id, a.tipoEvento]));

  const presencas: PresencaDossie[] = presencasRows.map((p) => ({
    formandoId: p.formandoId,
    agendamentoId: p.agendamentoId,
    data: p.data.toISOString(),
    presente: p.presente,
    statusFormador: p.statusFormador,
    nivelFormativo: p.nivelFormativo as NivelFormativo,
  }));

  const eventos: EventoDossie[] = eventosRows.map((e) => ({
    tipo: e.tipo,
    perspectiva: e.perspectiva as EventoDossie["perspectiva"],
    notaAdesao: e.notaAdesao as EventoDossie["notaAdesao"],
    textoAvaliacao: e.textoAvaliacao,
    dataInicioLicenca: e.dataInicioLicenca?.toISOString() ?? null,
    dataFimLicenca: e.dataFimLicenca?.toISOString() ?? null,
    motivo: e.motivo,
    criadoEm: e.criadoEm.toISOString(),
  }));

  // Evidências da fidelidade: pareceres textuais do FC (comentários de adesão) +
  // textos das avaliações por perspectiva.
  const evidenciasParecer: EvidenciaParecer[] = [
    ...comentarios.map((c) => ({ texto: c.texto, data: c.criadoEm.toISOString() })),
    ...eventosRows
      .filter((e) => e.tipo === "avaliacao-adesao" && e.textoAvaliacao)
      .map((e) => ({ texto: e.textoAvaliacao!, data: e.criadoEm.toISOString() })),
  ].sort((a, b) => b.data.localeCompare(a.data));

  const progressoEtapas: ProgressoEtapa[] = formando.progressoEtapas.map((p) => ({
    nivel: p.nivelFormativo as NivelFormativo,
    formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas,
    retirosComunitariosRealizados: p.retirosComunitariosRealizados,
    retirosPessoaisRealizados: p.retirosPessoaisRealizados,
    iniciouEm: p.iniciouEm?.toISOString(),
  }));

  const dossie = montarDossieFormando({
    formando: {
      id: formando.id,
      nome: formando.nome,
      nivelFormativo: formando.nivelFormativo as NivelFormativo,
      dataNascimento: formando.dataNascimento?.toISOString().split("T")[0] ?? null,
      estadoCivil: formando.estadoCivil as EstadoCivil,
      foto: formando.foto,
      progressoEtapas,
    },
    presencas,
    tipoEventoPorAgendamento,
    acompanhamentoDatas: acompanhamentos.map((a) => a.data.toISOString()),
    eventos,
    evidenciasParecer,
    cadenciaMeses: org?.cadenciaAcompanhamentoMeses,
  });

  return {
    dossie,
    formando: {
      id: formando.id,
      nome: formando.nome,
      nivelFormativo: formando.nivelFormativo as NivelFormativo,
      grupoFormacaoId: formando.grupoFormacaoId,
    },
  };
}
