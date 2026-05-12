export type NivelFormativo =
  | "pre-discipulado"
  | "discipulado"
  | "primeiras-promessas"
  | "formacao-permanente";

export type StatusPlano = "rascunho" | "em-revisao" | "ativo" | "arquivado";
export type StatusFormacao =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "reagendada";
export type Modalidade = "presencial" | "online" | "hibrida";
export type PerfilUsuario = "administrador" | "formador_comunitario";
export type TipoComentario = "adesao" | "dificuldade" | "progresso" | "observacao";
export type TipoCompromisso = "individual" | "geral";

export interface Morada {
  id: string;
  nome: string;
  endereco?: string;
  nivelFormativo: NivelFormativo;
  formadorId: string;
  planoId?: string;
  gradeId?: string;
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
  moradaId?: string;
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
  foto?: string;
  turmaId?: string;
  moradaId?: string;
  totalFormacoes: number;
  formacoesRealizadas: number;
}

export interface PlanoFormativo {
  id: string;
  nome: string;
  objetivos: string;
  fundamentacao: string;
  eixos: string[];
  nivelFormativo: NivelFormativo;
  vigenciaInicio: string;
  vigenciaFim: string;
  status: StatusPlano;
  documentoAnexo?: string;
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
  ativo: boolean;
  criadoEm: string;
}

export interface Formacao {
  id: string;
  tema: string;
  objetivo: string;
  descricao: string;
  nivelFormativo: NivelFormativo;
  eixoId?: string;
  eixoNome?: string;
  etapaId?: string;
  etapaNome?: string;
  formadorId: string;
  formadorNome: string;
  cargaHoraria: number;
  modalidade: Modalidade;
  materialApoio?: string;
  vezesUtilizada: number;
  criadoEm: string;
}

export interface Agendamento {
  id: string;
  formacaoId: string;
  formacaoTema: string;
  nivelFormativo: NivelFormativo;
  formadorId: string;
  formadorNome: string;
  dataInicio: string;
  dataFim: string;
  local?: string;
  linkOnline?: string;
  status: StatusFormacao;
  participantes: number;
  observacoes?: string;
  googleCalendarEventId?: string;
  criadoEm: string;
}

export interface HistoricoFormando {
  id: string;
  formandoId: string;
  agendamentoId: string;
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
  texto: string;
  tipo: TipoComentario;
  criadoEm: string;
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
  administrador: "Formador Geral",
  formador_comunitario: "Formador Comunitário",
};

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
