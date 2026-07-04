import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REQUISITOS_ETAPAS } from "@/types";
import type { NivelFormativo, TipoFormacao } from "@/types";
import type { PortalAudiencia } from "@/lib/portal-routes";

export interface PortalHistoricoItem {
  id: string;
  agendamentoId: string;
  data: string; // ISO
  tema: string | null;
  tipoFormacao: TipoFormacao | null;
  presente: boolean;
  justificativa: string | null;
  confirmacaoFormando: boolean | null;
  justificativaFormando: string | null;
}

export interface PortalProximoEncontro {
  id: string;
  tema: string | null;
  tipoFormacao: TipoFormacao | null;
  dataInicio: string; // ISO
  dataFim: string; // ISO
  local: string | null;
  // Estado de resposta do formando (RSVP). `podeResponder` só é true quando já
  // existe registro de presença para o agendamento — pré-requisito dos endpoints
  // de confirmar/justificar.
  confirmacaoFormando: boolean | null;
  podeResponder: boolean;
}

export interface PortalDashboardData {
  formando: {
    id: string;
    nome: string;
    nivelFormativo: NivelFormativo;
    grupoFormacao: { id: string; nome: string } | null;
  };
  presenca: {
    percentual: number;
    total: number;
    presentes: number;
    historico: PortalHistoricoItem[];
  };
  proximosEncontros: PortalProximoEncontro[];
  progresso: {
    formacoesComunitariasRealizadas: number;
    retirosComunitariosRealizados: number;
    retirosPessoaisRealizados: number;
    requisitos: {
      formacoesComunitarias: number;
      retirosComunitarios: number;
      retirosPessoais: number;
    };
  } | null;
  // Presente quando o formando tem uma participação vocacional em andamento.
  vocacional: {
    participacaoId: string;
    status: string;
    acompanhamentoOferecido: boolean;
    solicitacaoPendente: boolean;
  } | null;
}

const STATUS_VOCACIONAL_ATIVOS = ["ativa", "aguardando_carta", "em_discernimento"] as const;

/**
 * Público do portal para um formando: "vocacional" quando ele tem, AGORA, uma
 * participação vocacional ativa vinculada à sua turma atual (mesma régua de
 * `vocacionalAtivo` do dashboard); caso contrário, "formando". É a fonte única
 * usada no login para marcar a `audiencia` na sessão. Deriva do dado real — não
 * da porta (URL) que a pessoa digitou.
 */
export async function getPortalAudiencia(
  formandoId: string,
  organizacaoId: string
): Promise<PortalAudiencia> {
  const formando = await prisma.formando.findUnique({
    where: { id: formandoId },
    select: { grupoFormacaoId: true },
  });
  if (!formando?.grupoFormacaoId) return "formando";
  const participacao = await prisma.participacaoVocacional.findFirst({
    where: {
      formandoId,
      organizacaoId,
      turmaId: formando.grupoFormacaoId,
      status: { in: [...STATUS_VOCACIONAL_ATIVOS] },
    },
    select: { id: true },
  });
  return participacao ? "vocacional" : "formando";
}

/**
 * Carrega todos os dados do dashboard do portal do formando.
 * Reutilizado pelo Server Component (`/portal/dashboard`) e pela rota `/api/portal/me`.
 * Retorna `null` quando o formando não existe / está inativo no tenant.
 */
export async function getPortalDashboardData(
  formandoId: string,
  organizacaoId: string
): Promise<PortalDashboardData | null> {
  const formando = await prisma.formando.findFirst({
    where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
    select: {
      id: true,
      nome: true,
      nivelFormativo: true,
      grupoFormacaoId: true,
      grupoFormacao: { select: { id: true, nome: true } },
    },
  });

  if (!formando) return null;

  const nivel = formando.nivelFormativo as NivelFormativo;
  const agora = new Date();

  // Participação vocacional em andamento (se houver). Carregada antes do cálculo
  // de presença porque muda o ESCOPO desse cálculo.
  const participacaoVocacional = await prisma.participacaoVocacional.findFirst({
    where: { formandoId, organizacaoId, status: { in: [...STATUS_VOCACIONAL_ATIVOS] } },
    orderBy: { criadoEm: "desc" },
    include: {
      turma: { select: { vocacionalAcompanhamentoAtivo: true } },
      solicitacoes: { where: { status: "pendente" }, select: { id: true }, take: 1 },
    },
  });
  // Vocacionado ativo = está, agora, vinculado à turma vocacional.
  const vocacionalAtivo =
    !!participacaoVocacional && formando.grupoFormacaoId === participacaoVocacional.turmaId;

  // Presença e histórico consideram apenas encontros já realizados (data < agora).
  // Registros de presença de eventos futuros existem para o RSVP, mas não devem
  // entrar no percentual nem surgir como "ausente" no histórico.
  // Para o vocacionado, a presença é escopada à TURMA vocacional (o "curso" dele),
  // e não ao nivelFormativo de origem — que continua o mesmo durante o período.
  const wherePresenca: Prisma.PresencaFormacaoWhereInput = vocacionalAtivo
    ? { formandoId, organizacaoId, data: { lt: agora }, agendamento: { grupoFormacaoId: formando.grupoFormacaoId } }
    : { formandoId, organizacaoId, nivelFormativo: nivel, data: { lt: agora } };

  const [total, presentes, historico, proximosEncontros, progressoEtapa] =
    await Promise.all([
      // COUNT separado: percentual correto independente do limit do histórico
      prisma.presencaFormacao.count({ where: wherePresenca }),
      prisma.presencaFormacao.count({ where: { ...wherePresenca, presente: true } }),
      prisma.presencaFormacao.findMany({
        where: wherePresenca,
        select: {
          id: true,
          agendamentoId: true,
          data: true,
          formacaoTema: true,
          presente: true,
          justificativa: true,
          confirmacaoFormando: true,
          justificativaFormando: true,
          agendamento: { select: { tipoFormacao: true } },
        },
        orderBy: { data: "desc" },
        take: 100,
      }),
      formando.grupoFormacaoId
        ? prisma.agendamento.findMany({
            where: {
              organizacaoId,
              dataInicio: { gte: agora },
              status: { not: "cancelada" },
              deletedAt: null,
              // Encontros do grupo do formando — legado (grupoFormacaoId) OU via
              // junção multi-grupo (item 1.7).
              OR: [
                { grupoFormacaoId: formando.grupoFormacaoId },
                { grupos: { some: { grupoFormacaoId: formando.grupoFormacaoId } } },
              ],
            },
            select: {
              id: true,
              formacaoTema: true,
              tipoFormacao: true,
              dataInicio: true,
              dataFim: true,
              local: true,
            },
            orderBy: { dataInicio: "asc" },
            take: 5,
          })
        : Promise.resolve([]),
      prisma.progressoEtapa.findUnique({
        where: {
          formandoId_nivelFormativo: { formandoId, nivelFormativo: nivel },
        },
        select: {
          formacoesComunitariasRealizadas: true,
          retirosComunitariosRealizados: true,
          retirosPessoaisRealizados: true,
        },
      }),
    ]);

  // Estado de resposta (RSVP) para os próximos encontros: só há ação possível
  // quando já existe registro de presença para o agendamento.
  const proximosIds = proximosEncontros.map((a) => a.id);
  const presencasProximos = proximosIds.length
    ? await prisma.presencaFormacao.findMany({
        where: { formandoId, organizacaoId, agendamentoId: { in: proximosIds } },
        select: { agendamentoId: true, confirmacaoFormando: true },
      })
    : [];
  const respostaPorAgendamento = new Map(
    presencasProximos.map((p) => [p.agendamentoId, p.confirmacaoFormando])
  );

  const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;
  // O progresso por etapa não se aplica ao candidato em período vocacional
  // (ele é pré-formativo): o card "Meu período vocacional" carrega o contexto.
  const requisitos = vocacionalAtivo ? null : (REQUISITOS_ETAPAS[nivel] ?? null);

  return {
    formando: {
      id: formando.id,
      nome: formando.nome,
      nivelFormativo: nivel,
      grupoFormacao: formando.grupoFormacao
        ? { id: formando.grupoFormacao.id, nome: formando.grupoFormacao.nome }
        : null,
    },
    presenca: {
      percentual,
      total,
      presentes,
      historico: historico.map((p) => ({
        id: p.id,
        agendamentoId: p.agendamentoId,
        data: p.data.toISOString(),
        tema: p.formacaoTema,
        tipoFormacao: (p.agendamento?.tipoFormacao as TipoFormacao | undefined) ?? null,
        presente: p.presente,
        justificativa: p.justificativa,
        confirmacaoFormando: p.confirmacaoFormando,
        justificativaFormando: p.justificativaFormando,
      })),
    },
    proximosEncontros: proximosEncontros.map((a) => ({
      id: a.id,
      tema: a.formacaoTema,
      tipoFormacao: a.tipoFormacao as TipoFormacao,
      dataInicio: a.dataInicio.toISOString(),
      dataFim: a.dataFim.toISOString(),
      local: a.local,
      confirmacaoFormando: respostaPorAgendamento.get(a.id) ?? null,
      podeResponder: respostaPorAgendamento.has(a.id),
    })),
    progresso: requisitos
      ? {
          formacoesComunitariasRealizadas:
            progressoEtapa?.formacoesComunitariasRealizadas ?? 0,
          retirosComunitariosRealizados:
            progressoEtapa?.retirosComunitariosRealizados ?? 0,
          retirosPessoaisRealizados:
            progressoEtapa?.retirosPessoaisRealizados ?? 0,
          requisitos: {
            formacoesComunitarias: requisitos.formacoesComunitarias,
            retirosComunitarios: requisitos.retirosComunitarios,
            retirosPessoais: requisitos.retirosPessoais,
          },
        }
      : null,
    vocacional: participacaoVocacional
      ? {
          participacaoId: participacaoVocacional.id,
          status: participacaoVocacional.status,
          acompanhamentoOferecido: participacaoVocacional.turma.vocacionalAcompanhamentoAtivo,
          solicitacaoPendente: participacaoVocacional.solicitacoes.length > 0,
        }
      : null,
  };
}
