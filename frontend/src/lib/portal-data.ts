import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REQUISITOS_ETAPAS } from "@/types";
import type { EstadoCivil, NivelFormativo, TipoFormacao, Modalidade } from "@/types";
import type { PortalAudiencia } from "@/lib/portal-routes";
import { R2_ENABLED, getImageR2Url, readLocalFile } from "@/lib/storage";
import { camposFaltantes } from "@/lib/perfil-completude";
import { agendamentoRelevanteOR } from "@/lib/agendamento-scope";

/**
 * Resolve o campo `foto` do formando (base64 legado, key R2 ou key local) em um
 * src pronto para `<img>` DENTRO do portal. O portal usa sessão própria
 * (`portal_session`) e não a sessão do app, então não pode consumir
 * `/api/imagens/serve` (que exige `auth()`). Por isso a foto é entregue já
 * resolvida pelo servidor, como os demais dados: base64 volta direto; R2 vira
 * URL pré-assinada de curta duração; arquivo local é embutido como data URL.
 */
async function resolvePortalFoto(foto: string | null): Promise<string | undefined> {
  if (!foto) return undefined;
  if (foto.startsWith("data:")) return foto;
  try {
    if (R2_ENABLED) {
      return (await getImageR2Url(foto, 3600)) ?? undefined;
    }
    const buffer = await readLocalFile(foto);
    const ext = foto.split(".").pop()?.toLowerCase() ?? "jpg";
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

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
  // Encontro 1:1 de partilha e oração (não uma formação coletiva).
  acompanhamentoComunitario: boolean;
  dataInicio: string; // ISO
  dataFim: string; // ISO
  diaInteiro: boolean;
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
    /** Foto do formando resolvida para uso direto no portal (ou undefined). */
    fotoUrl?: string;
    grupoFormacao: { id: string; nome: string } | null;
    /**
     * Rótulos dos dados pessoais ainda não preenchidos pela pessoa (Fase 3 do
     * cadastro mínimo). Vazio = perfil completo. Alimenta o nudge do portal.
     */
    perfilCamposFaltantes: string[];
  };
  presenca: {
    percentual: number;
    total: number;
    presentes: number;
    historico: PortalHistoricoItem[];
  };
  proximosEncontros: PortalProximoEncontro[];
  // Materiais de direcionamento de retiro liberados para o grupo do formando.
  // O download é por rota dedicada (`/api/portal/retiros/[retiroPlanoId]/material`),
  // então aqui só viaja o retiroPlanoId + nome — nunca o id do arquivo cru.
  retirosMateriais: { retiroPlanoId: string; numero: number; tema: string; nome: string }[];
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
  // Acompanhamento formativo — EXCLUSIVO do Portal do Formando (null para
  // vocacionados, que têm o próprio card vocacional). Próximo encontro marcado
  // pelo formador + se o formando já tem um pedido pendente.
  acompanhamentoFormativo: {
    proximaData: string | null;
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
    .filter((m): m is typeof m & { dataNascimento: Date } => m.dataNascimento != null)
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

/**
 * Evangelização de UM capítulo pelas redes. Cada rede rende Fruto uma vez por
 * capítulo (crédito na confiança — sem prova). O link é opcional no Instagram e
 * obrigatório no YouTube; guardamos o que o vocacionado colou, quando colou.
 */
export interface CapituloEvangelizacao {
  instagramFeito: boolean;
  instagramUrl: string | null;
  youtubeFeito: boolean;
  youtubeUrl: string | null;
}

/**
 * Material formativo do capítulo, definido pelo formador no cadastro do livro e
 * exibido (read-only) na estrutura da leitura no portal. Todos os campos são
 * opcionais; `material` é null quando o capítulo não tem nenhum preenchido.
 */
export interface CapituloMaterial {
  objetivo: string | null;
  palavrasChave: string | null;
  comentarios: string | null;
  perguntas: string | null;
  acaoPratica: string | null;
  partilha: string | null;
}

// Monta o material do capítulo a partir das colunas; retorna null quando nenhum
// campo está preenchido (para o portal não renderizar um bloco vazio).
function materialDeCapitulo(c: {
  objetivo: string | null; palavrasChave: string | null; comentarios: string | null;
  perguntas: string | null; acaoPratica: string | null; partilha: string | null;
}): CapituloMaterial | null {
  const { objetivo, palavrasChave, comentarios, perguntas, acaoPratica, partilha } = c;
  const algum = objetivo || palavrasChave || comentarios || perguntas || acaoPratica || partilha;
  return algum ? { objetivo, palavrasChave, comentarios, perguntas, acaoPratica, partilha } : null;
}

export interface TravessiaCapitulo {
  id: string;
  numero: number;
  titulo: string;
  lido: boolean;
  // Meta de conclusão da leitura (YYYY-MM-DD) definida pelo formador, ou null.
  metaConclusao: string | null;
  // Material formativo (objetivo, perguntas, ação prática…) — null se vazio.
  material: CapituloMaterial | null;
  // Partilha do vocacionado sobre este capítulo (null quando não partilhou).
  partilha: TravessiaPartilha | null;
  // Registro de divulgação nas redes deste capítulo (Instagram/YouTube).
  evangelizacao: CapituloEvangelizacao;
}

export interface TravessiaLivro {
  id: string;
  titulo: string;
  autor: string | null;
  // Capa resolvida para exibição direta no portal (ou undefined se não houver).
  capaUrl?: string;
  ordem: number;
  capitulos: TravessiaCapitulo[];
  totalCapitulos: number;
  capitulosLidos: number;
  percentual: number;
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
  // @ do Instagram da comunidade — dica exibida ao registrar a postagem de cada
  // capítulo (o formador reforça o uso no dia a dia). null quando não configurado.
  orgInstagram: string | null;
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
        capitulos: {
          orderBy: { numero: "asc" },
          select: {
            id: true, numero: true, titulo: true, metaConclusao: true,
            objetivo: true, palavrasChave: true, comentarios: true,
            perguntas: true, acaoPratica: true, partilha: true,
          },
        },
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
      select: { instagramHandle: true },
    }),
  ]);

  if (livros.length === 0) return null;

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
  // Evangelização por capítulo (Instagram/YouTube). Uma linha por rede/capítulo.
  const evangelizacaoPorCapitulo = new Map<string, CapituloEvangelizacao>();
  for (const a of acoes) {
    if (!a.capituloId) continue;
    if (a.tipo !== "evangelizacao_instagram" && a.tipo !== "evangelizacao_youtube") continue;
    const atual =
      evangelizacaoPorCapitulo.get(a.capituloId) ??
      { instagramFeito: false, instagramUrl: null, youtubeFeito: false, youtubeUrl: null };
    if (a.tipo === "evangelizacao_instagram") {
      atual.instagramFeito = true;
      atual.instagramUrl = a.texto ?? null;
    } else {
      atual.youtubeFeito = true;
      atual.youtubeUrl = a.texto ?? null;
    }
    evangelizacaoPorCapitulo.set(a.capituloId, atual);
  }
  // Frutos = soma de todas as ações (leitura + partilha), valor fixado por linha.
  const frutosTotal = acoes.reduce((s, a) => s + a.frutos, 0);

  // Capas resolvidas para o portal (pre-signed R2 ou data URL em local), na
  // ordem dos livros — o map abaixo é síncrono, então resolvemos antes.
  const capasLivros = await Promise.all(livros.map((l) => resolvePortalFoto(l.capaUrl)));

  let totalCapitulos = 0;
  let capitulosLidos = 0;
  const livrosOut: TravessiaLivro[] = livros.map((l, idx) => {
    const capitulos = l.capitulos.map((c) => ({
      id: c.id,
      numero: c.numero,
      titulo: c.titulo,
      lido: lidos.has(c.id),
      metaConclusao: c.metaConclusao,
      material: materialDeCapitulo(c),
      partilha: partilhaPorCapitulo.get(c.id) ?? null,
      evangelizacao:
        evangelizacaoPorCapitulo.get(c.id) ??
        { instagramFeito: false, instagramUrl: null, youtubeFeito: false, youtubeUrl: null },
    }));
    const lidosNoLivro = capitulos.filter((c) => c.lido).length;
    totalCapitulos += capitulos.length;
    capitulosLidos += lidosNoLivro;
    return {
      id: l.id,
      titulo: l.titulo,
      autor: l.autor,
      capaUrl: capasLivros[idx],
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
    orgInstagram: org?.instagramHandle ?? null,
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
  const formando = await prisma.formando.findFirst({
    where: { id: formandoId, organizacaoId },
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
 * Dados pessoais editáveis pela própria pessoa em /portal/perfil. Traz só os
 * campos da fronteira "pessoa" (nunca dado formativo nem sigiloso de
 * acompanhamento) + a identidade de exibição (nome/nível/grupo, read-only). A
 * `dataNascimento` volta como YYYY-MM-DD via componentes UTC — datas date-only
 * são gravadas à meia-noite UTC (ver feedback-date-only-timezone); usar o fuso
 * local no split rolaria o dia. `null` quando o formando não existe/está inativo.
 */
export interface PortalPerfil {
  nome: string;
  nivelFormativo: NivelFormativo;
  grupoNome: string | null;
  // Campos definidos pelo responsável (read-only no portal).
  email: string;
  dataIngresso: string; // YYYY-MM-DD
  modalidade: Modalidade;
  /** Valor cru da foto (key R2/local ou base64) — só para saber se há imagem. */
  foto: string | null;
  /** Foto resolvida para preview direto no portal (ou undefined). */
  fotoUrl?: string;
  dataNascimento: string | null; // YYYY-MM-DD
  estadoCivil: EstadoCivil;
  telefone: string;
  nomeSocial: string | null;
  // Endereço residencial
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  paisResidencia: string | null;
  cep: string | null;
  // Canônicos (documentos eclesiásticos)
  nacionalidade: string | null;
  rg: string | null;
  orgaoEmissor: string | null;
  paroquiaReferencia: string | null;
  numFilhos: number | null;
}

export async function getPortalPerfil(
  formandoId: string,
  organizacaoId: string
): Promise<PortalPerfil | null> {
  const f = await prisma.formando.findFirst({
    where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
    select: {
      nome: true,
      nivelFormativo: true,
      email: true,
      dataIngresso: true,
      modalidade: true,
      foto: true,
      dataNascimento: true,
      estadoCivil: true,
      telefone: true,
      nomeSocial: true,
      endereco: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      paisResidencia: true,
      cep: true,
      nacionalidade: true,
      rg: true,
      orgaoEmissor: true,
      paroquiaReferencia: true,
      numFilhos: true,
      grupoFormacao: { select: { nome: true } },
    },
  });
  if (!f) return null;

  const fotoUrl = await resolvePortalFoto(f.foto);
  return {
    nome: f.nome,
    nivelFormativo: f.nivelFormativo as NivelFormativo,
    grupoNome: f.grupoFormacao?.nome ?? null,
    email: f.email,
    dataIngresso: f.dataIngresso.toISOString().split("T")[0],
    modalidade: f.modalidade as Modalidade,
    foto: f.foto,
    fotoUrl,
    dataNascimento: f.dataNascimento
      ? f.dataNascimento.toISOString().split("T")[0]
      : null,
    estadoCivil: f.estadoCivil as EstadoCivil,
    telefone: f.telefone,
    nomeSocial: f.nomeSocial,
    endereco: f.endereco,
    numero: f.numero,
    complemento: f.complemento,
    bairro: f.bairro,
    cidade: f.cidade,
    estado: f.estado,
    paisResidencia: f.paisResidencia,
    cep: f.cep,
    nacionalidade: f.nacionalidade,
    rg: f.rg,
    orgaoEmissor: f.orgaoEmissor,
    paroquiaReferencia: f.paroquiaReferencia,
    numFilhos: f.numFilhos,
  };
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
      foto: true,
      nivelFormativo: true,
      grupoFormacaoId: true,
      grupoFormacao: { select: { id: true, nome: true } },
      // Campos pessoais — só para medir a completude do cadastro (Fase 3).
      dataNascimento: true,
      telefone: true,
      nacionalidade: true,
      rg: true,
      orgaoEmissor: true,
      cep: true,
    },
  });

  if (!formando) return null;

  const fotoUrl = await resolvePortalFoto(formando.foto);

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
      prisma.agendamento.findMany({
        where: {
          organizacaoId,
          dataInicio: { gte: agora },
          status: { not: "cancelada" },
          deletedAt: null,
          // Fonte única da regra de "eventos relevantes ao formando" (mesma do
          // escopo de RSVP) — grupo próprio, acompanhamento 1:1 e org-wide.
          OR: agendamentoRelevanteOR({
            id: formandoId,
            grupoFormacaoId: formando.grupoFormacaoId,
            nivelFormativo: nivel,
          }),
        },
        select: {
          id: true,
          formacaoTema: true,
          tipoFormacao: true,
          tipoEvento: true,
          dataInicio: true,
          dataFim: true,
          diaInteiro: true,
          local: true,
        },
        orderBy: { dataInicio: "asc" },
        take: 5,
      }),
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

  // Materiais de direcionamento de retiro LIBERADOS para o grupo do formando.
  // A liberação (RetiroMaterialLiberacao) já escopa por grupo; aqui trazemos os
  // retiros (comunitários e pessoais) com material do formando anexado. O download
  // é servido por rota própria que reautoriza pela ponte (nunca pelo id do arquivo).
  const retirosMateriaisRaw = formando.grupoFormacaoId
    ? await prisma.retiroMaterialLiberacao.findMany({
        where: { grupoFormacaoId: formando.grupoFormacaoId, organizacaoId },
        select: {
          retiroPlanoId: true,
          retiroPlano: {
            select: { numero: true, tema: true, materialFormandoAnexo: true, materialFormandoAnexoId: true },
          },
        },
      })
    : [];
  const retirosMateriais = retirosMateriaisRaw
    .filter((l) => l.retiroPlano.materialFormandoAnexoId)
    .map((l) => ({
      retiroPlanoId: l.retiroPlanoId,
      numero: l.retiroPlano.numero,
      tema: l.retiroPlano.tema,
      nome: l.retiroPlano.materialFormandoAnexo ?? "Material do retiro",
    }))
    .sort((a, b) => a.numero - b.numero);

  const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;
  // O progresso por etapa não se aplica ao candidato em período vocacional
  // (ele é pré-formativo): o card "Meu período vocacional" carrega o contexto.
  const requisitos = vocacionalAtivo ? null : (REQUISITOS_ETAPAS[nivel] ?? null);

  // Acompanhamento formativo — SÓ para formandos não-vocacionais (Portal do
  // Formando). Próximo encontro marcado pelo formador + pedido pendente do próprio
  // formando. Vocacionados têm o card vocacional e não carregam isto.
  const [proximoAcompanhamento, solicitacaoAcompPendente] = vocacionalAtivo
    ? [null, null]
    : await Promise.all([
        prisma.acompanhamentoFormando.findFirst({
          where: { formandoId, organizacaoId, data: { gte: agora } },
          orderBy: { data: "asc" },
          select: { data: true },
        }),
        prisma.solicitacaoAcompanhamentoFormando.findFirst({
          where: { formandoId, organizacaoId, status: "pendente" },
          select: { id: true },
        }),
      ]);

  return {
    formando: {
      id: formando.id,
      nome: formando.nome,
      nivelFormativo: nivel,
      fotoUrl,
      grupoFormacao: formando.grupoFormacao
        ? { id: formando.grupoFormacao.id, nome: formando.grupoFormacao.nome }
        : null,
      perfilCamposFaltantes: camposFaltantes({
        dataNascimento: formando.dataNascimento?.toISOString() ?? null,
        telefone: formando.telefone,
      }),
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
      // Distingue o Acompanhamento Comunitário (encontro 1:1) da formação coletiva.
      acompanhamentoComunitario: a.tipoEvento === "acompanhamento_comunitario",
      dataInicio: a.dataInicio.toISOString(),
      dataFim: a.dataFim.toISOString(),
      diaInteiro: a.diaInteiro,
      local: a.local,
      confirmacaoFormando: respostaPorAgendamento.get(a.id) ?? null,
      // Todo encontro futuro em que o formando está envolvido é respondível — a
      // linha de presença é criada no ato (UPSERT), fechando push → portal → RSVP.
      podeResponder: true,
    })),
    retirosMateriais,
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
    acompanhamentoFormativo: vocacionalAtivo
      ? null
      : {
          proximaData: proximoAcompanhamento?.data.toISOString() ?? null,
          solicitacaoPendente: !!solicitacaoAcompPendente,
        },
  };
}
