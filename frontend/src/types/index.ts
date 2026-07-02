export type NivelFormativo =
  | "pre-discipulado"
  | "discipulado"
  | "primeiras-promessas"
  | "formacao-permanente"
  // Pré-formativo: o Período Vocacional é um nível selecionável em planos/grades,
  // mas NÃO faz parte de SEQUENCIA_ETAPAS (a escada de promoção automática) — seu
  // ciclo é governado por ParticipacaoVocacional + processo de admissão.
  | "vocacional";

export type TipoOrganizacao =
  | "nova_comunidade"
  | "grupo_oracao"
  | "instituto_religioso"
  | "centro_formativo";

export type TipoGrupoFormacao = "estruturado" | "livre";

export type StatusPlano = "rascunho" | "em-revisao" | "ativo" | "arquivado";
export type StatusFormacao =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "reagendada";
export type Modalidade = "presencial" | "online" | "hibrida";
export type PerfilUsuario = "formador_geral" | "administrador" | "formador_comunitario" | "super_admin";
export type PlanoAssinatura = "GRATUITO" | "BASICO" | "INTERMEDIARIO" | "AVANCADO" | "PERSONALIZADO";
export type StatusOrganizacao = "TRIAL" | "ATIVO" | "SUSPENSO" | "CANCELADO";
export type TipoComentario = "adesao" | "dificuldade" | "progresso" | "observacao";
export type PerspectivaFormativa = "humana" | "espiritual" | "comunitaria";
export type TipoCompromisso = "individual" | "geral";
export type TipoFormacao = "comunitaria" | "retiro-comunitario" | "retiro-pessoal" | "atividade-extra";

export interface ProgressoEtapa {
  nivel: NivelFormativo;
  formacoesComunitariasRealizadas: number;
  retirosComunitariosRealizados: number;
  retirosPessoaisRealizados: number;
  iniciouEm?: string;
  concluiuEm?: string;
  dataMissaCompromisso?: string;
}

export interface RequisitosEtapa {
  nivel: NivelFormativo;
  formacoesComunitarias: number;
  retirosComunitarios: number;
  retirosPessoais: number;
  duracaoAnos: number;
}

export interface GrupoFormacao {
  id: string;
  nome: string;
  localReuniao?: string;
  tipo: TipoGrupoFormacao;
  nivelFormativo?: NivelFormativo;
  formadorId?: string;
  planoId?: string;
  gradeId?: string;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  imagemUrl?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  avatar?: string;
  ativo: boolean;
  criadoEm: string;
  grupoFormacaoId?: string;
}

export interface Formando {
  id: string;
  nome: string;
  dataNascimento: string;
  estadoCivil: EstadoCivil;
  modalidade: Modalidade;
  nivelFormativo: NivelFormativo;
  dataIngresso: string;
  telefone: string;
  email: string;
  ativo: boolean;
  motivoInatividade?: "desligamento-voluntario" | "desligamento-compulsorio" | "licenca";
  foto?: string;
  turmaId?: string;
  grupoFormacaoId?: string;
  totalFormacoes: number;
  formacoesRealizadas: number;
  progressoEtapas: ProgressoEtapa[];
  // Campos canônicos (jornada vocacional)
  nomeSocial?: string;
  nacionalidade?: string;
  rg?: string;
  orgaoEmissor?: string;
  cep?: string;
  paroquiaReferencia?: string;
  numFilhos?: number;
}

export interface PlanoFormativo {
  id: string;
  nome: string;
  objetivos: string;
  fundamentacao: string;
  eixos: EixoPlano[];
  retiros?: RetiroPlano[];
  nivelFormativo: NivelFormativo;
  vigenciaInicio?: string;
  vigenciaFim?: string;
  status: StatusPlano;
  documentoAnexo?: string;
  documentoAnexoId?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Eixo {
  id: string;
  nome: string;
  descricao: string;
  gradeId: string;
  ordem: number;
  cor?: string;
  eixoPlanoId?: string;
}

export interface RetiroPlano {
  id: string;
  planoId: string;
  tipo: "comunitario" | "pessoal";
  numero: number;
  tema: string;
  trechoBiblico?: string;
  objetivo: string;
  quandoRealizar: string;
  cargaHoraria: number;
}

export interface EixoPlano {
  id: string;
  nome: string;
  nomeEtapa?: string;
  objetivo: string;
  intervaloEncontros: string;
  cargaHoraria: number;
  areaFormacao: string;
  ordem?: number;
}

export interface Etapa {
  id: string;
  nome: string;
  descricao: string;
  eixoId: string;
  ordem: number;
  cargaHoraria: number;
}

export interface GradeFormativa {
  id: string;
  nome: string;
  planoId: string;
  planoNome: string;
  nivelFormativo: NivelFormativo;
  vigenciaInicio: string;
  vigenciaFim: string;
  versao: string;
  eixos: Eixo[];
  etapas: Etapa[];
  totalFormacoes: number;
  objetivos?: string;
  fundamentacao?: string;
  documentoAnexo?: string;
  documentoAnexoId?: string;
  ativo: boolean;
  criadoEm: string;
}

export interface Formacao {
  id: string;
  tema: string;
  objetivo: string;
  descricao: string;
  nivelFormativo: NivelFormativo;
  tipoFormacao: TipoFormacao;
  eixoId?: string;
  eixoNome?: string;
  etapaId?: string;
  etapaNome?: string;
  formadorId: string;
  formadorNome: string;
  cargaHoraria: number;
  modalidade: Modalidade;
  materialApoio?: string;
  documentoAnexo?: string;
  documentoAnexoId?: string;
  gradeId?: string;
  gradeNome?: string;
  numero?: number;
  observacoesFormador?: string;
  vezesUtilizada: number;
  criadoEm: string;
}

export interface Agendamento {
  id: string;
  formacaoId: string;
  formacaoTema: string;
  nivelFormativo: NivelFormativo;
  tipoFormacao: TipoFormacao;
  formadorId: string;
  formadorNome: string;
  dataInicio: string;
  dataFim: string;
  local?: string;
  linkOnline?: string;
  status: StatusFormacao;
  participantes: number;
  grupoFormacaoId?: string;
  observacoes?: string;
  googleCalendarEventId?: string;
  criadoEm: string;
}

export interface HistoricoFormando {
  id: string;
  formandoId: string;
  agendamentoId?: string;
  formacaoTema: string;
  data: string;
  status: StatusFormacao;
  presente: boolean;
  observacao?: string;
}

export interface PresencaFormacao {
  id: string;
  agendamentoId: string;
  formacaoTema: string;
  data: string;
  formandoId: string;
  formandoNome: string;
  nivelFormativo: NivelFormativo;
  presente: boolean;
  justificativa?: string;
}

export interface ComentarioFormando {
  id: string;
  formandoId: string;
  formandoNome: string;
  formadorId: string;
  formadorNome?: string;
  texto: string;
  tipo: TipoComentario;
  criadoEm: string;
}

export type TipoEventoFormando =
  | "avaliacao-adesao"
  | "solicitacao-desligamento"
  | "desligamento"
  | "licenca"
  | "retiro"
  | "aprofundamento"
  | "vigilia"
  | "missao";

export type NotaAdesao = "otima" | "boa" | "regular" | "insuficiente";

export type TipoDesligamento = "voluntario" | "compulsorio";

export interface DocumentoAnexo {
  id: string;
  nome: string;
  tamanho: number;
  tipo: string;
  criadoEm: string;
}

export interface EventoFormando {
  id: string;
  formandoId: string;
  formadorId: string;
  tipo: TipoEventoFormando;
  criadoEm: string;
  /** avaliacao-adesao */
  periodoInicio?: string;
  periodoFim?: string;
  notaAdesao?: NotaAdesao;
  perspectiva?: PerspectivaFormativa;
  textoAvaliacao?: string;
  /** solicitacao-desligamento / desligamento / licenca */
  motivo?: string;
  /** desligamento */
  tipoDesligamento?: TipoDesligamento;
  dataEfetiva?: string;
  /** checklist compartilhado: solicitacao-desligamento e desligamento */
  checklistDevolveuEstatuto?: boolean;
  checklistDevolveuSacramental?: boolean;
  /** solicitacao-desligamento */
  checklistApresentouCarta?: boolean;
  /** desligamento compulsorio */
  checklistAcompanhadoModerador?: boolean;
  /** licenca */
  dataInicioLicenca?: string;
  dataFimLicenca?: string;
  /** documentos anexados */
  documentos?: DocumentoAnexo[];
}

export type StatusRelatorio = "rascunho" | "finalizado";
export type RecomendacaoEtapa = "avanca" | "repete" | "licenca" | "desligamento";

export interface RelatorioEtapa {
  id: string;
  formandoId: string;
  formadorId: string;
  nivelFormativo: NivelFormativo;
  avaliacaoHumana?: NotaAdesao;
  avaliacaoEspiritual?: NotaAdesao;
  avaliacaoComunitaria?: NotaAdesao;
  textoNarrativo?: string;
  pontosForteza?: string;
  desafios?: string;
  recomendacao?: RecomendacaoEtapa;
  textoRecomendacao?: string;
  status: StatusRelatorio;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Compromisso {
  id: string;
  formadorId: string;
  titulo: string;
  descricao?: string;
  dataInicio: string;
  dataFim: string;
  local?: string;
  linkOnline?: string;
  tipo: TipoCompromisso;
  formandoId?: string;
  formandoNome?: string;
  googleCalendarEventId?: string;
  criadoEm: string;
}

export interface DashboardStats {
  totalAgendadas: number;
  totalRealizadas: number;
  totalCanceladas: number;
  taxaRealizacao: number;
  totalFormandos: number;
  formandosAtivos: number;
  evolucaoMensal: { mes: string; agendadas: number; realizadas: number }[];
  porNivel: { nivel: NivelFormativo; quantidade: number; percentual: number }[];
  proximasFormacoes: Agendamento[];

  // "Minha semana" (item 2.2) — destaques humanos/formativos, escopados por perfil
  aniversariantesSemana?: { id: string; nome: string; quando: string }[];
  marcosFormativos?: { id: string; nome: string; nivelFormativo: NivelFormativo; progresso: number }[];

  // FC — presença e acompanhamento (últimos 90 dias)
  taxaPresencaGrupoFormacao?: number | null;
  formandosPresenca?: {
    id: string; nome: string; nivelFormativo: NivelFormativo;
    totalSessoes: number; sessoesCom: number;
    taxa: number; // -1 = sem dados
    perspectivas: {
      humana?: NotaAdesao;
      espiritual?: NotaAdesao;
      comunitaria?: NotaAdesao;
    };
  }[];

  // FG/Admin — visão estratégica
  totalGruposFormacao?: number;
  totalPlanosAtivos?: number;
  gruposFormacaoSemPlano?: number;
  gruposFormacaoSemGrade?: number;
  gruposFormacaoComGradeExpirada?: number;
  fcsSemGrupoFormacao?: number;
  gruposFormacaoResumo?: {
    id: string; nome: string; tipo: TipoGrupoFormacao; nivelFormativo?: NivelFormativo;
    totalFormandos: number; formandosAtivos: number;
    temPlano: boolean; temGrade: boolean; formadorNome?: string;
    taxaPresenca?: number | null;   // últimos 90 dias, null = sem registros
    gradeVigente?: boolean;         // false = grade expirada ou sem grade
  }[];
}

export const NIVEL_FORMATIVO_LABELS: Record<NivelFormativo, string> = {
  "pre-discipulado": "Pré-Discipulado",
  discipulado: "Discipulado",
  "primeiras-promessas": "Primeiras Promessas",
  "formacao-permanente": "Formação Permanente",
  vocacional: "Período Vocacional",
};

export const STATUS_PLANO_LABELS: Record<StatusPlano, string> = {
  rascunho: "Rascunho",
  "em-revisao": "Em Revisão",
  ativo: "Ativo",
  arquivado: "Arquivado",
};

export const STATUS_FORMACAO_LABELS: Record<StatusFormacao, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  reagendada: "Reagendada",
};

export const MODALIDADE_LABELS: Record<Modalidade, string> = {
  presencial: "Presencial",
  online: "Online",
  hibrida: "Híbrida",
};

export const PERFIL_USUARIO_LABELS: Record<PerfilUsuario, string> = {
  formador_geral: "Formador Geral",
  administrador: "Administrador",
  formador_comunitario: "Formador Comunitário",
  super_admin: "Super Admin",
};

export const PLANO_ASSINATURA_LABELS: Record<PlanoAssinatura, string> = {
  GRATUITO: "Sem assinatura",
  BASICO: "Básico",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
  PERSONALIZADO: "Personalizado",
};

/** Preços de referência para MRR estimado (R$/mês por organização). */
export const MRR_PRICE: Record<PlanoAssinatura, number> = {
  GRATUITO:     0,
  BASICO:       97,
  INTERMEDIARIO:197,
  AVANCADO:     397,
  PERSONALIZADO:890,
};

/** Retorna true para tipos de org que têm acesso às features canônicas (Jornada Vocacional, documentos). */
export function hasCanonicalAccess(tipoOrganizacao: TipoOrganizacao | null | undefined): boolean {
  return tipoOrganizacao === "nova_comunidade" || tipoOrganizacao === "instituto_religioso";
}

/**
 * Retorna true se a org pode usar o módulo Período Vocacional (e, por extensão,
 * o Livro de Registro): tipos canônicos têm acesso nativo; qualquer outra org
 * (ex.: grupo de oração que amadurece) precisa do flag `vocacionalHabilitado`.
 */
export function hasVocacionalAccess(
  tipoOrganizacao: TipoOrganizacao | null | undefined,
  vocacionalHabilitado: boolean | null | undefined,
): boolean {
  return hasCanonicalAccess(tipoOrganizacao) || vocacionalHabilitado === true;
}

export const STATUS_ORGANIZACAO_LABELS: Record<StatusOrganizacao, string> = {
  TRIAL: "Trial",
  ATIVO: "Ativo",
  SUSPENSO: "Suspenso",
  CANCELADO: "Cancelado",
};

/** Retorna true se `role` tem ao menos o mesmo nível que `required`. */
export function temPermissao(
  role: string | undefined,
  required: PerfilUsuario
): boolean {
  const nivel: Record<PerfilUsuario, number> = {
    formador_comunitario: 1,
    formador_geral: 2,
    administrador: 3,
    super_admin: 99,
  };
  return (nivel[role as PerfilUsuario] ?? 0) >= nivel[required];
}

export function isSuperAdmin(role: string | undefined): boolean {
  return role === "super_admin";
}

export function isGestao(role: string | undefined): boolean {
  return role === "administrador" || role === "formador_geral";
}

export const NIVEL_FORMATIVO_ICONS: Record<NivelFormativo, string> = {
  "pre-discipulado": "🌱",
  discipulado: "📖",
  "primeiras-promessas": "🌟",
  "formacao-permanente": "🔥",
  vocacional: "🧭",
};

export const STATUS_PLANO_STYLES: Record<StatusPlano, string> = {
  rascunho: "bg-slate-100 text-slate-600 border-slate-200",
  "em-revisao": "bg-amber-100 text-amber-700 border-amber-200",
  ativo: "bg-emerald-100 text-emerald-700 border-emerald-200",
  arquivado: "bg-slate-100 text-slate-400 border-slate-200",
};

export const STATUS_FORMACAO_STYLES: Record<StatusFormacao, string> = {
  agendada: "bg-blue-100 text-blue-700 border-blue-200",
  confirmada: "bg-emerald-100 text-emerald-700 border-emerald-200",
  realizada: "bg-slate-100 text-slate-600 border-slate-200",
  cancelada: "bg-red-100 text-red-600 border-red-200",
  reagendada: "bg-amber-100 text-amber-700 border-amber-200",
};

export type EstadoCivil = "solteiro" | "casado" | "divorciado" | "viuvo";

export const ESTADO_CIVIL_LABELS: Record<EstadoCivil, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

export const EIXO_COLORS: string[] = [
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

export function isAdminOrAbove(role: string | undefined): boolean {
  return role === "administrador" || role === "formador_geral" || role === "super_admin";
}

export const TIPO_COMENTARIO_LABELS: Record<TipoComentario, string> = {
  adesao: "Adesão",
  dificuldade: "Dificuldade",
  progresso: "Progresso",
  observacao: "Observação",
};

export const TIPO_COMENTARIO_CORES: Record<TipoComentario, string> = {
  adesao: "bg-emerald-100 text-emerald-700",
  dificuldade: "bg-red-100 text-red-700",
  progresso: "bg-blue-100 text-blue-700",
  observacao: "bg-amber-100 text-amber-700",
};

export const NIVEL_CORES: Record<NivelFormativo, string> = {
  "pre-discipulado": "bg-violet-100 text-violet-700",
  discipulado: "bg-blue-100 text-blue-700",
  "primeiras-promessas": "bg-emerald-100 text-emerald-700",
  "formacao-permanente": "bg-amber-100 text-amber-700",
  vocacional: "bg-rose-100 text-rose-700",
};

export const TIPO_FORMACAO_LABELS: Record<TipoFormacao, string> = {
  comunitaria: "Formação Comunitária",
  "retiro-comunitario": "Retiro Comunitário",
  "retiro-pessoal": "Retiro Pessoal",
  "atividade-extra": "Atividade Extra",
};

export const REQUISITOS_ETAPAS: Record<NivelFormativo, RequisitosEtapa> = {
  "pre-discipulado": {
    nivel: "pre-discipulado",
    formacoesComunitarias: 104,
    retirosComunitarios: 2,
    retirosPessoais: 8,
    duracaoAnos: 2,
  },
  discipulado: {
    nivel: "discipulado",
    formacoesComunitarias: 104,
    retirosComunitarios: 2,
    retirosPessoais: 8,
    duracaoAnos: 2,
  },
  "primeiras-promessas": {
    nivel: "primeiras-promessas",
    formacoesComunitarias: 52,
    retirosComunitarios: 1,
    retirosPessoais: 4,
    duracaoAnos: 1,
  },
  "formacao-permanente": {
    nivel: "formacao-permanente",
    formacoesComunitarias: 52,
    retirosComunitarios: 1,
    retirosPessoais: 4,
    duracaoAnos: 1,
  },
  // Pré-formativo: não há requisitos de etapa no sentido da formação comunitária
  // (o discernimento é acompanhado via ParticipacaoVocacional). Mantido neutro
  // por exaustividade do Record — fora da escada de promoção.
  vocacional: {
    nivel: "vocacional",
    formacoesComunitarias: 0,
    retirosComunitarios: 0,
    retirosPessoais: 0,
    duracaoAnos: 1,
  },
};

export const TIPO_EVENTO_LABELS: Record<TipoEventoFormando, string> = {
  "avaliacao-adesao": "Parecer do Formador",
  "solicitacao-desligamento": "Solicitação de Desligamento",
  desligamento: "Desligamento Compulsório",
  licenca: "Registro de Licença",
  retiro: "Retiro",
  aprofundamento: "Aprofundamento",
  vigilia: "Vigília",
  missao: "Missão",
};

export const TIPO_EVENTO_CORES: Record<TipoEventoFormando, string> = {
  "avaliacao-adesao": "bg-blue-100 text-blue-700",
  "solicitacao-desligamento": "bg-amber-100 text-amber-700",
  desligamento: "bg-red-100 text-red-700",
  licenca: "bg-violet-100 text-violet-700",
  retiro: "bg-orange-100 text-orange-700",
  aprofundamento: "bg-teal-100 text-teal-700",
  vigilia: "bg-indigo-100 text-indigo-700",
  missao: "bg-rose-100 text-rose-700",
};

export const NOTA_ADESAO_LABELS: Record<NotaAdesao, string> = {
  otima: "Ótima",
  boa: "Boa",
  regular: "Regular",
  insuficiente: "Insuficiente",
};

export const NOTA_ADESAO_CORES: Record<NotaAdesao, string> = {
  otima: "bg-emerald-100 text-emerald-700",
  boa: "bg-blue-100 text-blue-700",
  regular: "bg-amber-100 text-amber-700",
  insuficiente: "bg-red-100 text-red-700",
};

export const PERSPECTIVA_LABELS: Record<PerspectivaFormativa, string> = {
  humana: "Humana",
  espiritual: "Espiritual",
  comunitaria: "Comunitária",
};

export const NOTA_ADESAO_DOT: Record<NotaAdesao, string> = {
  otima: "bg-emerald-500",
  boa: "bg-blue-500",
  regular: "bg-amber-400",
  insuficiente: "bg-red-500",
};

export const SEQUENCIA_ETAPAS: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

/**
 * Níveis oferecidos nos seletores de plano/grade. Inclui o `vocacional`, que é
 * selecionável mas vive FORA de SEQUENCIA_ETAPAS (não há promoção automática a
 * partir dele). Use este conjunto para popular dropdowns; use SEQUENCIA_ETAPAS
 * apenas para a progressão formal entre etapas.
 */
export const NIVEIS_FORMATIVOS_SELECIONAVEIS: NivelFormativo[] = [
  ...SEQUENCIA_ETAPAS,
  "vocacional",
];

export function totalRequerido(nivel: NivelFormativo): number {
  const req = REQUISITOS_ETAPAS[nivel];
  return req.formacoesComunitarias + req.retirosComunitarios + req.retirosPessoais;
}

export function getProximaEtapa(nivel: NivelFormativo): NivelFormativo | null {
  const idx = SEQUENCIA_ETAPAS.indexOf(nivel);
  // Níveis fora da escada formal (ex.: vocacional) não têm "próxima etapa".
  if (idx === -1) return null;
  return idx < SEQUENCIA_ETAPAS.length - 1 ? SEQUENCIA_ETAPAS[idx + 1] : null;
}

export function podeAvancarEtapa(formando: Formando): boolean {
  if (formando.nivelFormativo === "formacao-permanente") return false;
  const req = REQUISITOS_ETAPAS[formando.nivelFormativo];
  const prog = (formando.progressoEtapas ?? []).find(
    (p) => p.nivel === formando.nivelFormativo
  );
  if (!prog) return false;
  return (
    prog.formacoesComunitariasRealizadas >= req.formacoesComunitarias &&
    prog.retirosComunitariosRealizados >= req.retirosComunitarios &&
    prog.retirosPessoaisRealizados >= req.retirosPessoais
  );
}

export const STATUS_RELATORIO_LABELS: Record<StatusRelatorio, string> = {
  rascunho: "Rascunho",
  finalizado: "Finalizado",
};

export const STATUS_RELATORIO_CORES: Record<StatusRelatorio, string> = {
  rascunho: "bg-amber-100 text-amber-700 border-amber-200",
  finalizado: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export const RECOMENDACAO_LABELS: Record<RecomendacaoEtapa, string> = {
  avanca: "Avança para próxima etapa",
  repete: "Repete a etapa atual",
  licenca: "Entra em licença",
  desligamento: "Desligamento",
};

export const RECOMENDACAO_CORES: Record<RecomendacaoEtapa, string> = {
  avanca: "bg-emerald-100 text-emerald-700",
  repete: "bg-amber-100 text-amber-700",
  licenca: "bg-violet-100 text-violet-700",
  desligamento: "bg-red-100 text-red-700",
};

export const TIPO_ORGANIZACAO_LABELS: Record<TipoOrganizacao, string> = {
  nova_comunidade: "Nova Comunidade",
  grupo_oracao: "Grupo de Oração",
  instituto_religioso: "Instituto Religioso",
  centro_formativo: "Centro Formativo",
};

export const TIPO_GRUPO_FORMACAO_LABELS: Record<TipoGrupoFormacao, string> = {
  estruturado: "Estruturado",
  livre: "Livre",
};

// ==========================================================
// JORNADA VOCACIONAL
// ==========================================================

export type TipoProcessoEclesiastico =
  | "admissao_etapa1"
  | "admissao_etapa2"
  | "promessas_iniciais"
  | "renovacao_promessas"
  | "promessas_definitivas"
  | "ministerio"
  | "missao"
  | "licenca"
  | "transferencia"
  | "desligamento"
  | "falecimento";

export type StatusProcessoEclesiastico =
  | "rascunho"
  | "em_andamento"
  | "em_revisao"
  | "aprovado"
  | "rejeitado"
  | "concluido"
  | "arquivado"
  | "cancelado";

export type TipoDocumentoEclesiastico =
  | "ato_admissao"
  | "informacoes_pastorais"
  | "declaracao_responsavel"
  | "ciencia_politicas_internas"
  | "termo_cerimonial"
  | "termo_consagracao"
  | "requerimento_renovacao"
  | "parecer_formativo"
  | "ato_admissao_renovacao"
  | "termo_renovacao"
  | "carta_missao"
  | "carta_transferencia"
  | "carta_licenca"
  | "termo_desligamento"
  | "dispensa_promessas";

export type StatusDocumentoEclesiastico = "pendente" | "gerado" | "assinado" | "arquivado" | "substituido";

export type TipoRegistroPromessa = "iniciais_temporarias" | "renovacao" | "definitivas" | "dispensa";

export const TIPO_REGISTRO_PROMESSA_LABELS: Record<TipoRegistroPromessa, string> = {
  iniciais_temporarias: "Primeiras Promessas",
  renovacao:            "Renovação de Promessas",
  definitivas:          "Promessas Definitivas",
  dispensa:             "Dispensa de Promessas",
};

/** Resumo do assento no Livro de Promessas (uso em componentes client). */
export interface RegistroPromessaResumo {
  id: string;
  tipo: TipoRegistroPromessa;
  tomo: string;
  folha: number;
  numero: number;
  numeroRegistro: string;
  dataVigenciaInicio: string;
  dataVigenciaFim: string | null;
  celebrante: string;
  localCelebracao: string;
  moderadorGeral: string;
  formadorGeralLocal: string | null;
  assistenteEclesiastico: string | null;
  secretario: string;
  formulaTexto: string;
  formandoId?: string;
  formandoNome?: string | null;
  criadoEm?: string;
}

export const TIPO_PROCESSO_LABELS: Record<TipoProcessoEclesiastico, string> = {
  admissao_etapa1:       "Admissão — Etapa 1",
  admissao_etapa2:       "Admissão — Etapa 2",
  promessas_iniciais:    "Promessas Iniciais",
  renovacao_promessas:   "Renovação de Promessas",
  promessas_definitivas: "Promessas Definitivas",
  ministerio:            "Ministério",
  missao:                "Missão",
  licenca:               "Licença",
  transferencia:         "Transferência",
  desligamento:          "Desligamento",
  falecimento:           "Falecimento",
};

export const STATUS_PROCESSO_LABELS: Record<StatusProcessoEclesiastico, string> = {
  rascunho:    "Rascunho",
  em_andamento: "Em andamento",
  em_revisao:  "Em revisão",
  aprovado:    "Aprovado",
  rejeitado:   "Rejeitado",
  concluido:   "Concluído",
  arquivado:   "Arquivado",
  cancelado:   "Cancelado",
};

export const STATUS_PROCESSO_COLORS: Record<StatusProcessoEclesiastico, string> = {
  rascunho:    "bg-muted text-muted-foreground",
  em_andamento: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  em_revisao:  "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  aprovado:    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejeitado:   "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  concluido:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  arquivado:   "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
  cancelado:   "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-500",
};

export interface ProcessoEclesiastico {
  id: string;
  organizacaoId: string;
  formandoId: string;
  formandoNome?: string;
  tipo: TipoProcessoEclesiastico;
  nivelFormativo: NivelFormativo;
  status: StatusProcessoEclesiastico;
  dadosFormulario: Record<string, unknown>;
  favoravelRenovacao?: boolean | null;
  numeroRenovacao?: number | null;
  criadoPorId: string;
  criadoPorNome?: string;
  criadoEm: string;
  atualizadoEm: string;
  documentos?: DocumentoEclesiastico[];
}

export interface DocumentoEclesiastico {
  id: string;
  processoId: string;
  tipo: TipoDocumentoEclesiastico;
  status: StatusDocumentoEclesiastico;
  versao: number;
  arquivoId?: string | null;
  substituiDocumentoId?: string | null;
  geradoEm?: string | null;
  geradoPorId?: string | null;
  observacoes?: string | null;
  criadoEm: string;
}

// ── Livro de Registro Geral da Jornada Vocacional ──────────────────────────

export type StatusTomo = "aberto" | "encerrado";

export type CondicaoMembro =
  | "candidato"
  | "membro_em_experiencia"
  | "membro_em_formacao"
  | "membro_primeiras_promessas"
  | "membro_consagrado"
  | "membro_definitivas"
  | "desligado"
  | "falecido";

export type TipoTermoRegistro =
  | "admissao_etapa"
  | "conclusao_etapa"
  | "primeiras_promessas"
  | "renovacao_promessas"
  | "promessas_definitivas"
  | "ministerio"
  | "missao"
  | "transferencia"
  | "licenca_inicio"
  | "licenca_termino"
  | "desligamento"
  | "dispensa"
  | "falecimento"
  | "retificacao"
  | "ingresso_vocacional"
  | "termino_vocacional";

export const CONDICAO_MEMBRO_LABELS: Record<CondicaoMembro, string> = {
  candidato:                  "Candidato",
  membro_em_experiencia:      "Membro em Experiência",
  membro_em_formacao:         "Membro em Formação",
  membro_primeiras_promessas: "Membro de Primeiras Promessas",
  membro_consagrado:          "Membro Consagrado",
  membro_definitivas:         "Membro de Promessas Definitivas",
  desligado:                  "Desligado",
  falecido:                   "Falecido",
};

export const TIPO_TERMO_LABELS: Record<TipoTermoRegistro, string> = {
  admissao_etapa:        "Admissão a Etapa",
  conclusao_etapa:       "Conclusão de Etapa",
  primeiras_promessas:   "Primeiras Promessas",
  renovacao_promessas:   "Renovação de Promessas",
  promessas_definitivas: "Promessas Definitivas",
  ministerio:            "Conferição de Ministério",
  missao:                "Envio em Missão",
  transferencia:         "Transferência de Núcleo",
  licenca_inicio:        "Início de Licença",
  licenca_termino:       "Término de Licença",
  desligamento:          "Desligamento",
  dispensa:              "Dispensa de Promessas",
  falecimento:           "Falecimento",
  retificacao:           "Retificação",
  ingresso_vocacional:   "Ingresso no Período Vocacional",
  termino_vocacional:    "Término do Período Vocacional",
};

/** Etiqueta curta exibida ao lado do título do termo (espelha o mock-up). */
export const TIPO_TERMO_TAGS: Record<TipoTermoRegistro, string> = {
  admissao_etapa:        "ETAPA · INGRESSO",
  conclusao_etapa:       "ETAPA · CONCLUSÃO",
  primeiras_promessas:   "PROMESSAS · INICIAIS",
  renovacao_promessas:   "PROMESSAS · RENOVAÇÃO",
  promessas_definitivas: "PROMESSAS · DEFINITIVAS",
  ministerio:            "MINISTÉRIO",
  missao:                "MISSÃO",
  transferencia:         "TRANSFERÊNCIA",
  licenca_inicio:        "LICENÇA · INÍCIO",
  licenca_termino:       "LICENÇA · TÉRMINO",
  desligamento:          "DESLIGAMENTO",
  dispensa:              "DISPENSA",
  falecimento:           "FALECIMENTO",
  retificacao:           "RETIFICAÇÃO",
  ingresso_vocacional:   "VOCACIONAL · INGRESSO",
  termino_vocacional:    "VOCACIONAL · TÉRMINO",
};

/** Tipos de termo que o administrador lavra manualmente (sem processo de origem). */
export const TIPOS_TERMO_MANUAIS: TipoTermoRegistro[] = [
  "conclusao_etapa",
  "licenca_termino",
  "dispensa",
  "falecimento",
  "retificacao",
];

export interface TermoRegistro {
  id: string;
  tomoId: string;
  numero: number;
  tipo: TipoTermoRegistro;
  formandoId?: string | null;
  formandoNome?: string | null;
  dataEvento: string;
  dataLavratura: string;
  corpoTexto: string;
  condicaoResultante?: CondicaoMembro | null;
  processoId?: string | null;
  registroPromessaId?: string | null;
  arquivoRefId?: string | null;
  retificaTermoId?: string | null;
  lavradoAutomaticamente: boolean;
  criadoPorId?: string | null;
}

export interface LivroRegistroTomo {
  id: string;
  numero: number;
  totalFolhas: number;
  status: StatusTomo;
  aberturaData: string;
  aberturaModerador: string;
  aberturaSecretario: string;
  aberturaTexto: string;
  aberturaArquivoId?: string | null;
  encerramentoData?: string | null;
  encerramentoTexto?: string | null;
  encerramentoArquivoId?: string | null;
}

export interface ComunidadeConfig {
  nome: string;
  tipoOrganizacao?: TipoOrganizacao;
  descricao: string;
  endereco: string;
  missao: string;
  anoFundacao: string;
  /** Termo personalizado para "Morada" (ex.: Grupo, Célula, Casa) */
  termoGrupoFormacao?: string;
  /** Termo personalizado para "Formando" (ex.: Membro, Participante) */
  termoFormando?: string;
  /** Termo personalizado para "Formador Comunitário" (ex.: Líder, Coordenador) */
  termoFormador?: string;
  /** Termos personalizados para as etapas formativas */
  termoPreDiscipulado?: string;
  termoDiscipulado?: string;
  termoPrimeirasPromessas?: string;
  termoFormacaoPermanente?: string;
  /** Período Vocacional — módulo opcional, desacoplado do tipoOrganizacao */
  vocacionalHabilitado?: boolean;
  termoVocacional?: string;
  termoAcompanhamentoVocacional?: string;
  vocacionalDuracaoPadraoMeses?: number;
  /** Opt-out do FG: envia e-mails de agenda (criação + lembretes) aos formandos. Push/bell não afetados. */
  emailAgendamentoAtivo?: boolean;
  /** Nome da instância da plataforma nesta organização (ex.: "Portal Formativo da Diocese") */
  nomePlataforma?: string;
  /** Logo da organização em base64 ou URL */
  logoUrl?: string;
  /** Chave da paleta de cores (ex.: "azul", "verde") */
  temaCor?: string;
}
