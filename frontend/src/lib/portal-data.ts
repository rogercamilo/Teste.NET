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

/**
 * Material de uma formação já realizada, visível para o formando no portal.
 * Reúne o contexto da formação (tema/objetivo/descrição), o material de apoio
 * em texto/links e a indicação de anexo — o download do anexo é feito por rota
 * dedicada e autorizada (`/api/portal/formacoes/[agendamentoId]/material`), então
 * aqui só viaja o nome do arquivo, nunca o `documentoAnexoId` cru.
 */
export interface PortalMaterialItem {
  agendamentoId: string;
  data: string; // ISO — data do encontro
  tema: string | null;
  tipoFormacao: TipoFormacao | null;
  formadorNome: string | null;
  presente: boolean;
  objetivo: string | null;
  descricao: string | null;
  materialApoio: string | null;
  anexoNome: string | null;
  temMaterial: boolean;
}

/**
 * Fim do dia de HOJE no fuso local (America/Sao_Paulo). O material "abre" a
 * partir do DIA agendado para o encontro — não da hora exata —, então incluímos
 * qualquer encontro cuja data caia em hoje ou antes. O Brasil não observa mais
 * horário de verão, então o offset fixo -03:00 é seguro.
 */
function fimDeHojeLocal(): Date {
  const hoje = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // YYYY-MM-DD
  return new Date(`${hoje}T23:59:59.999-03:00`);
}

/**
 * Formações já realizadas escaladas para o formando, com o material de estudo.
 * A ponte de autorização é a própria `PresencaFormacao` (o formando foi escalado
 * para aquele encontro) — independe de ter comparecido. Só entram encontros do
 * tipo formação (com `Formacao` vinculada) cuja data já chegou (a partir do dia
 * agendado). Escopado por formando + organização. `null`/inexistente → lista vazia.
 */
export async function getPortalMateriais(
  formandoId: string,
  organizacaoId: string
): Promise<PortalMaterialItem[]> {
  const presencas = await prisma.presencaFormacao.findMany({
    where: {
      formandoId,
      organizacaoId,
      data: { lte: fimDeHojeLocal() },
      agendamento: { formacaoId: { not: null }, deletedAt: null },
    },
    select: {
      agendamentoId: true,
      data: true,
      presente: true,
      formacaoTema: true,
      agendamento: {
        select: {
          tipoFormacao: true,
          formadorNome: true,
          formacao: {
            select: {
              tema: true,
              objetivo: true,
              descricao: true,
              materialApoio: true,
              documentoAnexo: true,
            },
          },
        },
      },
    },
    orderBy: { data: "desc" },
    take: 200,
  });

  return presencas.map((p) => {
    const f = p.agendamento?.formacao;
    const objetivo = f?.objetivo?.trim() || null;
    const descricao = f?.descricao?.trim() || null;
    const materialApoio = f?.materialApoio?.trim() || null;
    const anexoNome = f?.documentoAnexo?.trim() || null;
    return {
      agendamentoId: p.agendamentoId,
      data: p.data.toISOString(),
      // Título = tema do ENCONTRO (denormalizado na presença), com o tema do
      // template da formação como reserva.
      tema: p.formacaoTema ?? f?.tema ?? null,
      tipoFormacao: (p.agendamento?.tipoFormacao as TipoFormacao | undefined) ?? null,
      formadorNome: p.agendamento?.formadorNome ?? null,
      presente: p.presente,
      objetivo,
      descricao,
      materialApoio,
      anexoNome,
      temMaterial: !!(objetivo || descricao || materialApoio || anexoNome),
    };
  });
}

/** Aniversariante do mês no mesmo grupo/turma (toque de comunidade). */
export interface PortalAniversariante {
  nome: string;
  dia: number;
  ehVoce: boolean;
  hoje: boolean;
}

/**
 * Aniversariantes do mês corrente no MESMO grupo/turma do formando — reforça o
 * sentido de família do portal. Nome + dia (sem ano/idade — só o necessário para
 * celebrar), ordenados por dia, com marcação de "hoje" e de "você". Mês/dia de
 * referência no fuso de São Paulo; o dia vem dos componentes UTC da data (datas
 * YYYY-MM-DD são gravadas como meia-noite UTC — ver feedback-date-only-timezone).
 * Sem grupo → lista vazia.
 */
export async function getPortalAniversariantes(
  formandoId: string,
  organizacaoId: string
): Promise<PortalAniversariante[]> {
  const eu = await prisma.formando.findFirst({
    where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
    select: { grupoFormacaoId: true },
  });
  if (!eu?.grupoFormacaoId) return [];

  const membros = await prisma.formando.findMany({
    where: { organizacaoId, grupoFormacaoId: eu.grupoFormacaoId, ativo: true, deletedAt: null },
    select: { id: true, nome: true, dataNascimento: true },
  });

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const mesAtual = Number(partes.find((p) => p.type === "month")?.value);
  const diaHoje = Number(partes.find((p) => p.type === "day")?.value);

  return membros
    .filter((m) => m.dataNascimento != null)
    .map((m) => ({
      nome: m.nome,
      mes: m.dataNascimento.getUTCMonth() + 1,
      dia: m.dataNascimento.getUTCDate(),
      ehVoce: m.id === formandoId,
    }))
    .filter((m) => m.mes === mesAtual)
    .sort((a, b) => a.dia - b.dia)
    .map((m) => ({ nome: m.nome, dia: m.dia, ehVoce: m.ehVoce, hoje: m.dia === diaHoje }));
}

/** Partilha textual do vocacionado sobre um capítulo, com a reação do formador. */
export interface TravessiaPartilha {
  texto: string;
  formadorCurtiu: boolean;
  formadorNota: string | null;
}

export interface TravessiaCapitulo {
  id: string;
  numero: number;
  titulo: string;
  lido: boolean;
  // Partilha do vocacionado sobre este capítulo (null quando não partilhou).
  partilha: TravessiaPartilha | null;
}

export interface TravessiaLivro {
  id: string;
  titulo: string;
  autor: string | null;
  ordem: number;
  capitulos: TravessiaCapitulo[];
  totalCapitulos: number;
  capitulosLidos: number;
  percentual: number;
}

/**
 * Estado da "Missão": evangelização da leitura pelas redes. Cada rede rende Fruto
 * uma vez por travessia (crédito na confiança — sem prova). `orgInstagram`/
 * `orgYoutube` são as redes da comunidade a sugerir no card / botão.
 */
export interface TravessiaMissao {
  instagramFeito: boolean;
  instagramUrl: string | null;
  youtubeFeito: boolean;
  youtubeUrl: string | null;
  orgInstagram: string | null;
  orgYoutube: string | null;
  orgNome: string;
}

/** Participante que optou por aparecer no Mural de Frutos (sem ranking). */
export interface MuralParticipante {
  nome: string;
  frutos: number;
}

/**
 * Mural de Frutos da turma: presente só quando o formador ligou. `turmaFrutosTotal`
 * é o coletivo (todos os vocacionados ativos); `participantes` traz apenas quem
 * optou por aparecer, EXCETO o próprio vocacionado (o cliente reinsere o card
 * dele com Frutos ao vivo ao alternar o opt-in). Ordem alfabética, sem ranking.
 */
export interface TravessiaMural {
  minhaExibicao: boolean;
  meuNome: string;
  turmaFrutosTotal: number;
  participantes: MuralParticipante[];
}

export interface PortalTravessia {
  frutosTotal: number;
  livros: TravessiaLivro[];
  totalCapitulos: number;
  capitulosLidos: number;
  percentualGeral: number;
  // Marcos atingidos no agregado da trilha (¼, ½, ¾, 100%).
  marcos: { um_quarto: boolean; metade: boolean; tres_quartos: boolean; completo: boolean };
  missao: TravessiaMissao;
  // Presente só quando o Mural está ligado na turma; caso contrário, null.
  mural: TravessiaMural | null;
}

/**
 * Trilha da Travessia do vocacionado: os livros indicados à SUA turma (ativos,
 * em ordem) com o estado de leitura de cada capítulo e o total de Frutos já
 * conquistados. A autorização é a pertença à turma — os livros vivem na turma
 * (`turmaId === grupoFormacaoId`) e as ações são escopadas ao formando. Retorna
 * `null` quando não há turma ou nenhum livro cadastrado (nada a exibir).
 */
export async function getPortalTravessia(
  formandoId: string,
  organizacaoId: string
): Promise<PortalTravessia | null> {
  const formando = await prisma.formando.findFirst({
    where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
    select: { grupoFormacaoId: true, grupoFormacao: { select: { muralFrutosAtivo: true } } },
  });
  if (!formando?.grupoFormacaoId) return null;
  const turmaId = formando.grupoFormacaoId;

  const [livros, acoes, org] = await Promise.all([
    prisma.leituraVocacional.findMany({
      where: { turmaId, organizacaoId, ativo: true },
      orderBy: { ordem: "asc" },
      include: {
        capitulos: { orderBy: { numero: "asc" }, select: { id: true, numero: true, titulo: true } },
      },
    }),
    // Escopado aos livros ATIVOS da turma atual (mesma régua dos `livros`
    // acima), senão `frutosTotal` contaria ações de livros desativados ou de
    // turma anterior. Traz TODAS as ações (leitura=1, partilha=3, evangelização
    // por rede=5) — os Frutos são a soma de todas elas. Evangelização tem
    // `capituloId` nulo (não é por capítulo), então NÃO filtramos por capítulo.
    prisma.acaoLeitura.findMany({
      where: {
        formandoId,
        organizacaoId,
        leitura: { turmaId, ativo: true },
      },
      select: {
        capituloId: true,
        frutos: true,
        tipo: true,
        texto: true,
        formadorCurtiu: true,
        formadorNota: true,
      },
    }),
    prisma.organizacao.findUnique({
      where: { id: organizacaoId },
      select: { nome: true, instagramHandle: true, youtubeUrl: true },
    }),
  ]);

  if (livros.length === 0) return null;

  const missao: TravessiaMissao = {
    instagramFeito: acoes.some((a) => a.tipo === "evangelizacao_instagram"),
    instagramUrl: acoes.find((a) => a.tipo === "evangelizacao_instagram")?.texto ?? null,
    youtubeFeito: acoes.some((a) => a.tipo === "evangelizacao_youtube"),
    youtubeUrl: acoes.find((a) => a.tipo === "evangelizacao_youtube")?.texto ?? null,
    orgInstagram: org?.instagramHandle ?? null,
    orgYoutube: org?.youtubeUrl ?? null,
    orgNome: org?.nome ?? "",
  };

  // Mural de Frutos — só quando o formador ligou na turma.
  const mural = formando.grupoFormacao?.muralFrutosAtivo
    ? await carregarMural(turmaId, organizacaoId, formandoId)
    : null;

  const lidos = new Set(acoes.filter((a) => a.tipo === "leitura").map((a) => a.capituloId));
  const partilhaPorCapitulo = new Map<string, TravessiaPartilha>(
    acoes
      .filter((a) => a.tipo === "partilha" && a.capituloId && a.texto)
      .map((a) => [
        a.capituloId as string,
        { texto: a.texto as string, formadorCurtiu: a.formadorCurtiu, formadorNota: a.formadorNota },
      ])
  );
  // Frutos = soma de todas as ações (leitura + partilha), valor fixado por linha.
  const frutosTotal = acoes.reduce((s, a) => s + a.frutos, 0);

  let totalCapitulos = 0;
  let capitulosLidos = 0;
  const livrosOut: TravessiaLivro[] = livros.map((l) => {
    const capitulos = l.capitulos.map((c) => ({
      id: c.id,
      numero: c.numero,
      titulo: c.titulo,
      lido: lidos.has(c.id),
      partilha: partilhaPorCapitulo.get(c.id) ?? null,
    }));
    const lidosNoLivro = capitulos.filter((c) => c.lido).length;
    totalCapitulos += capitulos.length;
    capitulosLidos += lidosNoLivro;
    return {
      id: l.id,
      titulo: l.titulo,
      autor: l.autor,
      ordem: l.ordem,
      capitulos,
      totalCapitulos: capitulos.length,
      capitulosLidos: lidosNoLivro,
      percentual: capitulos.length > 0 ? Math.round((lidosNoLivro / capitulos.length) * 100) : 0,
    };
  });

  const percentualGeral =
    totalCapitulos > 0 ? Math.round((capitulosLidos / totalCapitulos) * 100) : 0;
  const fracao = totalCapitulos > 0 ? capitulosLidos / totalCapitulos : 0;

  return {
    frutosTotal,
    livros: livrosOut,
    totalCapitulos,
    capitulosLidos,
    percentualGeral,
    marcos: {
      um_quarto: fracao >= 0.25,
      metade: fracao >= 0.5,
      tres_quartos: fracao >= 0.75,
      completo: totalCapitulos > 0 && capitulosLidos === totalCapitulos,
    },
    missao,
    mural,
  };
}

/**
 * Agrega o Mural de Frutos de uma turma para o portal: o coletivo (todos os
 * vocacionados ATIVOS) e os cards de quem optou por aparecer (sem ranking, ordem
 * alfabética). Escopado por org + turma e aos livros ATIVOS — espelha o portal.
 */
async function carregarMural(
  turmaId: string,
  organizacaoId: string,
  formandoId: string
): Promise<TravessiaMural> {
  const participacoes = await prisma.participacaoVocacional.findMany({
    where: { turmaId, organizacaoId, status: { in: [...STATUS_VOCACIONAL_ATIVOS] } },
    select: { formandoId: true, muralOptIn: true, formando: { select: { nome: true } } },
    orderBy: { formando: { nome: "asc" } },
  });

  const minha = participacoes.find((p) => p.formandoId === formandoId);
  const minhaExibicao = minha?.muralOptIn ?? false;
  const meuNome = minha?.formando.nome ?? "";
  const ids = participacoes.map((p) => p.formandoId);
  if (ids.length === 0) {
    return { minhaExibicao, meuNome, turmaFrutosTotal: 0, participantes: [] };
  }

  // Frutos por vocacionado (só livros ATIVOS da turma), num único groupBy.
  const somas = await prisma.acaoLeitura.groupBy({
    by: ["formandoId"],
    where: { formandoId: { in: ids }, organizacaoId, leitura: { turmaId, ativo: true } },
    _sum: { frutos: true },
  });
  const frutosPorFormando = new Map(somas.map((s) => [s.formandoId, s._sum.frutos ?? 0]));

  const turmaFrutosTotal = participacoes.reduce(
    (t, p) => t + (frutosPorFormando.get(p.formandoId) ?? 0),
    0
  );
  // Exclui o próprio vocacionado: o cliente reinsere o card dele (com Frutos ao
  // vivo) assim que alterna o opt-in, sem esperar reload.
  const participantes: MuralParticipante[] = participacoes
    .filter((p) => p.muralOptIn && p.formandoId !== formandoId)
    .map((p) => ({ nome: p.formando.nome, frutos: frutosPorFormando.get(p.formandoId) ?? 0 }));

  return { minhaExibicao, meuNome, turmaFrutosTotal, participantes };
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
