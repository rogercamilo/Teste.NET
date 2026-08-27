/**
 * Fase 3 da personalização da Vitrine: blocos de texto carismáticos editáveis
 * por organização (preâmbulos, fórmulas, listas). Cada bloco tem um texto
 * PADRÃO tokenizado; a org pode sobrescrever com o SEU texto. Default e override
 * passam pelo mesmo resolver, que só interpola variáveis da whitelist — token
 * desconhecido fica literal (sem eval, sem injeção).
 *
 * Congelamento: o documento emitido é um Arquivo imutável e a regeneração de um
 * documento assinado/arquivado é bloqueada (gerar route → 409). Editar um bloco
 * depois NÃO altera o que já foi assinado; só afeta emissões futuras. Ver
 * [[project-livro-registro-vocacional]].
 */

import type { TipoDocumentoEclesiastico } from "@/types";

export type TipoBloco = "paragrafo" | "lista";

export interface BlocoDocumento {
  id: string;
  /** Documento da Vitrine a que este bloco pertence (agrupa por aba no editor). */
  documento: TipoDocumentoEclesiastico;
  /** Rótulo curto exibido no editor. */
  label: string;
  /** Ajuda curta no editor. */
  descricao: string;
  tipo: TipoBloco;
  /** Texto padrão tokenizado. Em `lista`, um item por linha. */
  padrao: string;
  /** Variáveis disponíveis neste bloco (para a paleta do editor). */
  variaveis: string[];
}

/**
 * Registro dos blocos editáveis. Adicionar um bloco = uma entrada aqui + usar
 * `resolveBloco`/`resolveBlocoLista` no template. Os `id` são estáveis (viram
 * chave em `Organizacao.documentosTextos`) — nunca renomear um id já lançado.
 */
export const BLOCOS: BlocoDocumento[] = [
  {
    id: "termo_consagracao.formula",
    documento: "termo_consagracao",
    label: "Fórmula de consagração",
    descricao: "Texto proferido no Termo de Consagração. Uma linha em branco separa parágrafos.",
    tipo: "paragrafo",
    padrao:
      "Eu, {{pessoa}}, diante de Deus e desta comunidade reunida em Seu nome, livremente me consagro a Ele por meio de {{promessa}} em {{org}}, comprometendo-me a viver o carisma e a missão desta comunidade com fidelidade, {{vigencia}}.\n\n" +
      "Faço estas {{promessa}} com plena consciência das exigências que assumo, confiante na graça de Deus e no apoio fraterno da comunidade.",
    variaveis: ["{{pessoa}}", "{{promessa}}", "{{org}}", "{{vigencia}}"],
  },
  {
    id: "termo_cerimonial.acolhimento",
    documento: "termo_cerimonial",
    label: "Acolhimento cerimonial",
    descricao: "Palavra de acolhida no Termo Cerimonial de Admissão. Uma linha em branco separa parágrafos.",
    tipo: "paragrafo",
    padrao:
      "Em nome de {{org}} e da nossa comunidade de fé, é com grande alegria que o(a) acolhemos nesta nova etapa da sua caminhada formativa: o {{discipulado}}.\n\n" +
      "Esta etapa representa um passo significativo em sua jornada vocacional. Ao ingressar no {{discipulado}}, você é convidado(a) a aprofundar seu comprometimento com a vida espiritual, comunitária e missionária, respondendo ao chamado que Deus lhe dirige por meio desta comunidade.\n\n" +
      "Que esta passagem seja marcada pela gratidão, pela abertura ao Espírito Santo e pelo desejo sincero de crescer em santidade e serviço. A comunidade inteira o(a) acompanha com oração e fraternidade.",
    variaveis: ["{{org}}", "{{discipulado}}"],
  },
  {
    id: "termo_cerimonial.compromisso",
    documento: "termo_cerimonial",
    label: "Compromisso cerimonial",
    descricao: "Fórmula de compromisso assumida na admissão à etapa.",
    tipo: "paragrafo",
    padrao:
      "Eu, {{pessoa}}, ao ingressar no {{discipulado}} de {{org}}, renovo meu comprometimento com a vida comunitária e me disponho a percorrer esta etapa com fidelidade, escuta e generosidade.",
    variaveis: ["{{pessoa}}", "{{discipulado}}", "{{org}}"],
  },
  {
    id: "ciencia.preambulo",
    documento: "ciencia_politicas_internas",
    label: "Preâmbulo das políticas internas",
    descricao: "Introdução da Declaração de Ciência, antes da lista de princípios.",
    tipo: "paragrafo",
    padrao:
      'Eu, {{pessoa}}, candidato(a) à etapa "{{etapa}}" em {{org}}, declaro ter lido, compreendido e aceito as políticas internas da organização, comprometendo-me a observar os seguintes princípios e normas de convivência:',
    variaveis: ["{{pessoa}}", "{{etapa}}", "{{org}}"],
  },
  {
    id: "ciencia.politicas",
    documento: "ciencia_politicas_internas",
    label: "Lista de políticas internas",
    descricao: "Princípios e normas de convivência. Um item por linha.",
    tipo: "lista",
    padrao: [
      "Participar regularmente das reuniões e encontros formativos previstos no plano formativo.",
      "Zelar pelo bem comum e pela fraternidade nas relações comunitárias.",
      "Manter sigilo sobre assuntos internos de caráter confidencial.",
      "Respeitar a autoridade e o carisma próprio da organização.",
      "Comunicar ao responsável canônico qualquer impedimento ou dificuldade relevante.",
      "Contribuir com dedicação e generosidade para as atividades missionárias e apostólicas.",
      "Cuidar dos bens materiais da organização com responsabilidade.",
      "Observar as normas e orientações pastorais estabelecidas pelo governo da organização.",
    ].join("\n"),
    variaveis: [],
  },
];

const BLOCO_POR_ID = new Map(BLOCOS.map((b) => [b.id, b]));

/** Ids válidos — usado para filtrar o que a org pode persistir. */
export const BLOCO_IDS = new Set(BLOCOS.map((b) => b.id));

/** Limite de caracteres por bloco (proteção contra payloads absurdos). */
export const BLOCO_MAX = 4000;

const TOKEN = /\{\{\s*([\w.]+)\s*\}\}/g;

function interpolar(texto: string, vars: Record<string, string>): string {
  return texto.replace(TOKEN, (m, key) => (key in vars ? vars[key] : m));
}

/** Texto cru do bloco: override não-vazio da org, senão o padrão do registro. */
function textoCru(id: string, textosCustom: Record<string, string> | undefined): string {
  const custom = textosCustom?.[id]?.trim();
  if (custom) return custom;
  return BLOCO_POR_ID.get(id)?.padrao ?? "";
}

/**
 * Resolve um bloco de PARÁGRAFO: aplica override/padrão + interpola variáveis e
 * devolve a lista de parágrafos (separados por linha em branco).
 */
export function resolveBlocoParagrafos(
  id: string,
  textosCustom: Record<string, string> | undefined,
  vars: Record<string, string>
): string[] {
  const resolvido = interpolar(textoCru(id, textosCustom), vars);
  return resolvido
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Resolve um bloco de LISTA: um item por linha (interpolado). */
export function resolveBlocoLista(
  id: string,
  textosCustom: Record<string, string> | undefined,
  vars: Record<string, string>
): string[] {
  return interpolar(textoCru(id, textosCustom), vars)
    .split("\n")
    .map((i) => i.trim())
    .filter(Boolean);
}
