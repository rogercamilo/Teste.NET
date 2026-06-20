// Shared types for the super-admin cockpit

export interface OrgRow {
  id: string;
  nome: string;
  planoAssinatura: string;
  tipoOrganizacao: string;
  status: string;
  trialExpiresAt: string | null;
  cortesia: boolean;
  cortesiaExpiresAt: string | null;
  cortesiaMotivo: string | null;
  onboardingConcluido: boolean;
  criadoEm: string;
  lastActivityAt: string | null;
  engajamento7d: number;
  storageBytes: number;
  _count: { gruposFormacao: number; formandos: number; usuarios: number };
}

export interface Metricas {
  totalOrgs: number;
  orgsAtivas: number;
  orgsTrials: number;
  orgsSuspensas: number;
  orgsCanceladas: number;
  orgsCortesia: number;
  totalFormandos: number;
  totalGruposFormacao: number;
  totalUsuarios: number;
  planoBreakdown: Record<string, number>;
  mrrEstimado: number;
  mrrReal: number | null;
  deletionsPendentes: number;
  crescimento30d: number;
  crescimentoAnterior30d: number;
  crescimentoPercent: number;
  arr: number;
  ticketMedio: number;
  churnRate30d: number;
  canceladas30d: number;
  mrrHistory?: { month: string; mrr: number }[];
  receitaEmRisco?: {
    count: number;
    mrrEmRisco: number;
    orgs: { id: string; nome: string; planoAssinatura: string }[];
  };
}

export interface LgpdData {
  deletionRequests: {
    id: string;
    tipo: string;
    status: string;
    usuarioId: string | null;
    organizacaoId: string | null;
    solicitadoEm: string;
    processadoEm: string | null;
  }[];
  deletionStats: { pendentes: number; processando: number; concluidos: number };
  privacyByTipo: { tipo: string; versao: string; _count: { id: number } }[];
  cookieTotal: number;
  cookieAnaliticos: number;
}

export interface ServicosData {
  storage: { provider: "r2" | "local"; totalArquivos: number; totalBytes: number; totalMB: number };
  topOrgsStorage: { organizacaoId: string; nome: string; arquivos: number; bytes: number; mb: number }[];
  db: {
    formandos: number;
    gruposFormacao: number;
    usuarios: number;
    agendamentos: number;
    presencas: number;
    formacoes: number;
    auditLogs: number;
    arquivos: number;
  };
  recentUploads: {
    id: string;
    nome: string;
    tamanho: number;
    tipo: string;
    uploadedByNome: string | null;
    criadoEm: string;
    orgNome: string;
  }[];
  comunicacao?: {
    smtpOwnCount: number;
    totalOrgs: number;
    pushTotal: number;
    topOrgsPush: { organizacaoId: string; nome: string; count: number }[];
  };
  storageTrend?: { label: string; bytes: number }[];
}

export interface SegurancaData {
  recentLogs: {
    id: string;
    acao: string;
    ip: string | null;
    criadoEm: string;
    detalhes: unknown;
    organizacao: { nome: string } | null;
    usuario: { nome: string; email: string } | null;
  }[];
  topAcoes7d: { acao: string; _count: { id: number } }[];
  deletionPendentes: number;
  recentDeletions: {
    id: string;
    tipo: string;
    status: string;
    usuarioId: string | null;
    organizacaoId: string | null;
    solicitadoEm: string;
    processadoEm: string | null;
  }[];
  privacyCount7d: number;
  logsCount24h: number;
  superAdminLogs: {
    id: string;
    acao: string;
    criadoEm: string;
    detalhes: unknown;
    organizacao: { nome: string } | null;
    usuario: { nome: string; email: string } | null;
  }[];
}

export type DialogAcao =
  | "suspender"
  | "reativar"
  | "cancelar"
  | "plano"
  | "excluir"
  | "cortesia"
  | "revogar-cortesia"
  | "estender-trial"
  | null;

export type Tab =
  | "visao-geral"
  | "organizacoes"
  | "financeiro"
  | "cortesias"
  | "infraestrutura"
  | "seguranca"
  | "lgpd";
