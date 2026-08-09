import type {
  TipoProcessoEclesiastico,
  TipoDocumentoEclesiastico,
  StatusProcessoEclesiastico,
  PerfilUsuario,
} from "@/types";
import { TIPO_PROCESSO_LABELS } from "@/types";

// Documentos gerados por tipo de processo.
// Condicionais (declaracao_responsavel, ato_admissao_renovacao) são avaliadas em runtime.
export function getDocumentosTipos(
  tipo: TipoProcessoEclesiastico,
  opts: { menorDeIdade?: boolean; favoravelRenovacao?: boolean } = {}
): TipoDocumentoEclesiastico[] {
  switch (tipo) {
    case "inicio_vocacional":
      return [
        "ato_admissao",
        "informacoes_pastorais",
        ...(opts.menorDeIdade ? (["declaracao_responsavel"] as TipoDocumentoEclesiastico[]) : []),
        "ciencia_politicas_internas",
      ];
    case "admissao_etapa":
      return [
        "ato_admissao",
        "informacoes_pastorais",
        ...(opts.menorDeIdade ? (["declaracao_responsavel"] as TipoDocumentoEclesiastico[]) : []),
        "ciencia_politicas_internas",
        "termo_cerimonial",
      ];
    case "promessas_iniciais":
    case "promessas_definitivas":
      return ["termo_consagracao"];
    case "renovacao_promessas":
      return [
        "requerimento_renovacao",
        "parecer_formativo",
        ...(opts.favoravelRenovacao ? (["ato_admissao_renovacao"] as TipoDocumentoEclesiastico[]) : []),
        "termo_renovacao",
      ];
    case "missao":
      return ["carta_missao"];
    case "transferencia":
      return ["carta_transferencia"];
    case "licenca":
      return ["carta_licenca"];
    case "desligamento":
      return ["termo_desligamento"];
    default:
      return [];
  }
}

// Verifica se o formando era menor de 18 anos na data de criação do processo
export function eraMenorDeIdade(dataNascimento: Date, dataReferencia: Date): boolean {
  const diff = dataReferencia.getFullYear() - dataNascimento.getFullYear();
  const mesAntes =
    dataReferencia.getMonth() < dataNascimento.getMonth() ||
    (dataReferencia.getMonth() === dataNascimento.getMonth() &&
      dataReferencia.getDate() < dataNascimento.getDate());
  return diff < 18 || (diff === 18 && mesAntes);
}

// Transições de status válidas por papel.
// - `exigeDocumentosGerados`: só libera a transição quando todos os documentos
//   canônicos já foram gerados (dá sentido concreto à etapa de preparação).
// - `exigeMotivo`: a transição captura um motivo (devolução para ajustes).
// - `variante`: dica de UI (ação destrutiva/negativa) para o botão.
type TransicaoStatus = {
  de: StatusProcessoEclesiastico;
  para: StatusProcessoEclesiastico;
  papeis: PerfilUsuario[];
  label: string;
  exigeDocumentosGerados?: boolean;
  exigeMotivo?: boolean;
  variante?: "primaria" | "destrutiva";
};

export const TRANSICOES_STATUS: TransicaoStatus[] = [
  {
    de: "rascunho",
    para: "em_andamento",
    // O formador comunitário inicia o processo: é o responsável pela etapa
    // formativa atual do formando e quem coleta os dados dos documentos.
    papeis: ["administrador", "formador_geral", "formador_comunitario"],
    label: "Iniciar processo",
  },
  {
    de: "em_andamento",
    para: "em_revisao",
    // Só avança para revisão com todos os documentos gerados.
    papeis: ["administrador", "formador_geral"],
    label: "Enviar para revisão",
    exigeDocumentosGerados: true,
  },
  {
    // Validação canônica: responsabilidade do Formador Geral; o Administrador
    // mantém o poder como reforço de gestão.
    de: "em_revisao",
    para: "aprovado",
    papeis: ["formador_geral", "administrador"],
    label: "Aprovar",
  },
  {
    // Devolução para ajustes: retorna a "Em andamento" com um motivo, criando o
    // laço de revisão (o preparador corrige e reenvia).
    de: "em_revisao",
    para: "em_andamento",
    papeis: ["formador_geral", "administrador"],
    label: "Devolver para ajustes",
    exigeMotivo: true,
    variante: "destrutiva",
  },
  {
    de: "aprovado",
    para: "concluido",
    papeis: ["formador_geral", "administrador"],
    label: "Concluir",
  },
  {
    de: "rascunho",
    para: "cancelado",
    papeis: ["administrador"],
    label: "Cancelar",
    variante: "destrutiva",
  },
  {
    de: "em_andamento",
    para: "cancelado",
    papeis: ["administrador"],
    label: "Cancelar",
    variante: "destrutiva",
  },
];

export function getTransicoesDisponiveis(
  statusAtual: StatusProcessoEclesiastico,
  papel: string
): TransicaoStatus[] {
  return TRANSICOES_STATUS.filter(
    (t) => t.de === statusAtual && t.papeis.includes(papel as PerfilUsuario)
  );
}

/** Um documento canônico conta como "gerado" quando tem o PDF anexado. */
export function documentoFoiGerado(doc: { arquivoId?: string | null }): boolean {
  return !!doc.arquivoId;
}

/**
 * Documentos ainda não gerados (bloqueiam o envio para revisão). Recebe os
 * documentos já materializados do processo — a lista é criada ao iniciar.
 */
export function documentosPendentesDeGeracao<T extends { arquivoId?: string | null }>(
  documentos: T[]
): T[] {
  return documentos.filter((d) => !documentoFoiGerado(d));
}

/** Todos os documentos exigidos foram gerados? (lista não-vazia e sem pendências) */
export function documentosProntosParaRevisao(
  documentos: { arquivoId?: string | null }[]
): boolean {
  return documentos.length > 0 && documentosPendentesDeGeracao(documentos).length === 0;
}

export function podeEditarFormulario(
  status: StatusProcessoEclesiastico,
  papel: string
): boolean {
  if (status === "concluido") return false;
  if (papel === "administrador") return true;
  if (papel === "formador_geral") return status !== "aprovado";
  // O formador comunitário preenche os dados durante a sua fase (antes da
  // revisão da gestão): edita enquanto o processo está em rascunho ou em andamento.
  if (papel === "formador_comunitario") return status === "rascunho" || status === "em_andamento";
  return false;
}

export const TIPO_DOCUMENTO_LABELS: Record<TipoDocumentoEclesiastico, string> = {
  ato_admissao:             "Ato de Admissão",
  informacoes_pastorais:    "Informações Pastorais e Formativas",
  declaracao_responsavel:   "Declaração do Responsável",
  ciencia_politicas_internas: "Ciência de Políticas Internas",
  termo_cerimonial:         "Termo Cerimonial",
  termo_consagracao:        "Termo de Consagração",
  requerimento_renovacao:   "Requerimento de Renovação",
  parecer_formativo:        "Parecer Formativo Anual",
  ato_admissao_renovacao:   "Ato de Admissão à Renovação",
  termo_renovacao:          "Termo de Renovação de Promessas",
  carta_missao:             "Carta de Missão",
  carta_transferencia:      "Carta de Transferência",
  carta_licenca:            "Carta de Licença",
  termo_desligamento:       "Termo de Desligamento",
  dispensa_promessas:       "Dispensa de Promessas",
};

// ── Campos canônicos obrigatórios para processos eclesiásticos ────────────────

type CamposCanonicos = {
  rg: string | null;
  orgaoEmissor: string | null;
  nacionalidade: string | null;
  cep: string | null;
  paroquiaReferencia: string | null;
};

export const CAMPOS_CANONICOS: Array<{
  campo: keyof CamposCanonicos;
  label: string;
}> = [
  { campo: "rg",               label: "RG"                       },
  { campo: "orgaoEmissor",     label: "Órgão emissor do RG"      },
  { campo: "nacionalidade",    label: "Nacionalidade"             },
  { campo: "cep",              label: "CEP"                       },
  { campo: "paroquiaReferencia", label: "Paróquia de referência" },
];

export function camposCanonicosFaltando(formando: CamposCanonicos): string[] {
  return CAMPOS_CANONICOS
    .filter(({ campo }) => !formando[campo])
    .map(({ label }) => label);
}

// ── Rótulo localizado de tipo de processo ──────────────────────────────────────

export interface TermosProcesso {
  etapa1: string;
  etapa2: string;
  etapa3: string;
  etapa4: string;
  promessa: string;
}

// ── Responsável da vez por estado do processo ─────────────────────────────────
// Cada estado tem um dono claro: a tela explicita de quem é a vez e o que essa
// pessoa precisa fazer, tornando visível o movimento de responsabilidade.

export interface ResponsavelDaVez {
  /** Papel esperado para agir agora. */
  papel: PerfilUsuario;
  /** Rótulo humano do responsável (ex.: "Formador Geral"). */
  papelLabel: string;
  /** Ação concreta esperada desse responsável. */
  acao: string;
}

export function responsavelDaVez(
  status: StatusProcessoEclesiastico
): ResponsavelDaVez | null {
  switch (status) {
    case "rascunho":
      return { papel: "formador_geral", papelLabel: "Preparação (formador)", acao: "iniciar o processo" };
    case "em_andamento":
      return { papel: "formador_geral", papelLabel: "Preparação (formador)", acao: "preencher os dados, gerar os documentos e enviar para revisão" };
    case "em_revisao":
      return { papel: "formador_geral", papelLabel: "Formador Geral", acao: "conferir os documentos e validar (aprovar ou devolver)" };
    case "aprovado":
      return { papel: "formador_geral", papelLabel: "Formador Geral", acao: "concluir e oficializar o processo" };
    default:
      return null; // concluido / rejeitado / cancelado / arquivado: sem próxima ação
  }
}

export function getTipoLabel(tipo: TipoProcessoEclesiastico, termos: TermosProcesso): string {
  if (tipo === "inicio_vocacional") return "Início Vocacional";
  // Admissão genérica: o estágio concreto (nível do formando) é exibido à parte,
  // na coluna "Etapa" da lista e no cabeçalho do processo.
  if (tipo === "admissao_etapa") return "Admissão à Etapa Formativa";
  if (tipo === "promessas_iniciais") return termos.etapa3;
  if (tipo === "promessas_definitivas") return `${termos.promessa}s Definitivas`;
  return TIPO_PROCESSO_LABELS[tipo];
}
