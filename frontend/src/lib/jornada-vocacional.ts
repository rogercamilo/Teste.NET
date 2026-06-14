import type {
  TipoProcessoEclesiastico,
  TipoDocumentoEclesiastico,
  StatusProcessoEclesiastico,
} from "@/types";

// Documentos gerados por tipo de processo.
// Condicionais (declaracao_responsavel, ato_admissao_renovacao) são avaliadas em runtime.
export function getDocumentosTipos(
  tipo: TipoProcessoEclesiastico,
  opts: { menorDeIdade?: boolean; favoravelRenovacao?: boolean } = {}
): TipoDocumentoEclesiastico[] {
  switch (tipo) {
    case "admissao_etapa1":
      return [
        "ato_admissao",
        "informacoes_pastorais",
        ...(opts.menorDeIdade ? (["declaracao_responsavel"] as TipoDocumentoEclesiastico[]) : []),
        "ciencia_politicas_internas",
      ];
    case "admissao_etapa2":
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

// Transições de status válidas por papel
type TransicaoStatus = {
  de: StatusProcessoEclesiastico;
  para: StatusProcessoEclesiastico;
  papeis: string[];
  label: string;
};

export const TRANSICOES_STATUS: TransicaoStatus[] = [
  {
    de: "rascunho",
    para: "em_andamento",
    papeis: ["administrador", "formador_geral"],
    label: "Iniciar processo",
  },
  {
    de: "em_andamento",
    para: "em_revisao",
    papeis: ["administrador", "formador_geral"],
    label: "Enviar para revisão",
  },
  {
    de: "em_revisao",
    para: "aprovado",
    papeis: ["administrador"],
    label: "Aprovar",
  },
  {
    de: "em_revisao",
    para: "rejeitado",
    papeis: ["administrador"],
    label: "Rejeitar",
  },
  {
    de: "aprovado",
    para: "concluido",
    papeis: ["administrador"],
    label: "Concluir",
  },
  {
    de: "rascunho",
    para: "cancelado",
    papeis: ["administrador"],
    label: "Cancelar",
  },
  {
    de: "em_andamento",
    para: "cancelado",
    papeis: ["administrador"],
    label: "Cancelar",
  },
];

export function getTransicoesDisponiveis(
  statusAtual: StatusProcessoEclesiastico,
  papel: string
): TransicaoStatus[] {
  return TRANSICOES_STATUS.filter(
    (t) => t.de === statusAtual && t.papeis.includes(papel)
  );
}

export function podeEditarFormulario(
  status: StatusProcessoEclesiastico,
  papel: string
): boolean {
  if (status === "concluido") return false;
  if (papel === "administrador") return true;
  if (papel === "formador_geral") return status !== "aprovado";
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
