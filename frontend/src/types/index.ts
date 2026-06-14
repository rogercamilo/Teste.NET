export type NivelFormativo =
  | "pre-discipulado"
  | "discipulado"
  | "primeiras-promessas"
  | "formacao-permanente";

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
export type PerspectivFormativa = "humana" | "espiritual" | "comunitaria";
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
  estadoCivil: "solteiro" | "casado" | "divorciado" | "viuvo";
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
  id: string;       // ID gerado pelo servidor
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
  perspectiva?: PerspectivFormativa;
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

/** Retorna true para tipos de org que têm acesso às features canônicas (Jornada Vocacional, documentos). */
export function hasCanonicalAccess(tipoOrganizacao: TipoOrganizacao | null | undefined): boolean {
  return tipoOrganizacao === "nova_comunidade" || tipoOrganizacao === "instituto_religioso";
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

export function isAdmin(role: string | undefined): boolean {
  return role === "administrador" || role === "formador_geral";
}

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

export const PERSPECTIV_LABELS: Record<PerspectivFormativa, string> = {
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

export function totalRequerido(nivel: NivelFormativo): number {
  const req = REQUISITOS_ETAPAS[nivel];
  return req.formacoesComunitarias + req.retirosComunitarios + req.retirosPessoais;
}

export function getProximaEtapa(nivel: NivelFormativo): NivelFormativo | null {
  const idx = SEQUENCIA_ETAPAS.indexOf(nivel);
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
  nivelFormativo: string;
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
  /** Nome da instância da plataforma nesta organização (ex.: "Portal Formativo da Diocese") */
  nomePlataforma?: string;
  /** Logo da organização em base64 ou URL */
  logoUrl?: string;
  /** Chave da paleta de cores (ex.: "azul", "verde") */
  temaCor?: string;
}
