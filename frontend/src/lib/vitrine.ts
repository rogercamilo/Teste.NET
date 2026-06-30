import type { TipoDocumentoEclesiastico } from "@/types";

/**
 * Vitrine de documentos: os 8 modelos REAIS da Jornada Vocacional disponíveis
 * para preview (com marca d'água "MODELO — SEM VALIDADE" e dados fictícios).
 * Exclui os tipos ainda em placeholder. Fonte única para a rota e a UI.
 */
export interface ItemVitrine {
  tipo: TipoDocumentoEclesiastico;
  label: string;
  descricao: string;
}

export const MARCA_DAGUA_PREVIEW = "MODELO — SEM VALIDADE";

export const ITENS_VITRINE: ItemVitrine[] = [
  {
    tipo: "ato_admissao",
    label: "Ato de Admissão",
    descricao: "Formaliza a entrada do candidato em uma etapa formativa, com identificação completa e dados da admissão.",
  },
  {
    tipo: "informacoes_pastorais",
    label: "Informações Pastorais e Formativas",
    descricao: "Consolida o histórico pastoral e o percurso formativo do membro para subsidiar decisões da governança.",
  },
  {
    tipo: "declaracao_responsavel",
    label: "Declaração do Responsável",
    descricao: "Declaração assinada pelo responsável canônico atestando o acompanhamento e a idoneidade do candidato.",
  },
  {
    tipo: "ciencia_politicas_internas",
    label: "Ciência de Políticas Internas",
    descricao: "Registra a ciência e o aceite das normas, do estatuto e das políticas internas da comunidade.",
  },
  {
    tipo: "termo_cerimonial",
    label: "Termo Cerimonial",
    descricao: "Documento da celebração litúrgica: celebrante, local, data e fórmula do rito.",
  },
  {
    tipo: "termo_consagracao",
    label: "Termo de Consagração",
    descricao: "Registra a consagração/promessa do membro, com a fórmula proferida e as testemunhas.",
  },
  {
    tipo: "requerimento_renovacao",
    label: "Requerimento de Renovação",
    descricao: "Pedido formal de renovação de promessas, com motivação e período de vigência.",
  },
  {
    tipo: "parecer_formativo",
    label: "Parecer Formativo Anual",
    descricao: "Avaliação anual do formador sobre o percurso do membro, com recomendações para a etapa seguinte.",
  },
];

const TIPOS_VITRINE = new Set<string>(ITENS_VITRINE.map((i) => i.tipo));

/** Type guard: o tipo informado é um dos modelos previsíveis da Vitrine? */
export function isTipoVitrine(tipo: string): tipo is TipoDocumentoEclesiastico {
  return TIPOS_VITRINE.has(tipo);
}
