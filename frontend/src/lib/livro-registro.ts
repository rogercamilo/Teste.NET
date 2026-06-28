import type { Prisma } from "@prisma/client";
import type {
  CondicaoMembro,
  TipoTermoRegistro,
  TipoProcessoEclesiastico,
} from "@/types";

export {
  CONDICAO_MEMBRO_LABELS,
  TIPO_TERMO_LABELS,
  TIPO_TERMO_TAGS,
  TIPOS_TERMO_MANUAIS,
} from "@/types";

// ── Helpers de redação ──────────────────────────────────────────────────────

const CARDINAIS_DIA = [
  "", "primeiro", "dois", "três", "quatro", "cinco", "seis", "sete", "oito",
  "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
  "dezessete", "dezoito", "dezenove", "vinte", "vinte e um", "vinte e dois",
  "vinte e três", "vinte e quatro", "vinte e cinco", "vinte e seis",
  "vinte e sete", "vinte e oito", "vinte e nove", "trinta", "trinta e um",
];

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
  "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const FOLHAS_EXTENSO: Record<number, string> = {
  100: "cem", 150: "cento e cinquenta", 200: "duzentas", 250: "duzentas e cinquenta",
  300: "trezentas", 400: "quatrocentas", 500: "quinhentas",
};

/** "Aos 02 (dois) dias do mês de fevereiro de 2026" */
export function dataPorExtenso(d: Date): string {
  const dia = d.getDate();
  const ext = CARDINAIS_DIA[dia] ?? String(dia);
  const ddmm = String(dia).padStart(2, "0");
  const plural = dia === 1 ? "dia" : "dias";
  return `Aos ${ddmm} (${ext}) ${plural} do mês de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Converte uma data informada pelo cliente em Date no fuso local.
 * Strings "YYYY-MM-DD" são ancoradas ao meio-dia local para evitar que a
 * conversão UTC role para o dia anterior (ex.: UTC-3 transformaria 03 em 02).
 */
export function parseDataLocal(input: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return new Date(input);
}

/** Data curta dd/MM/yyyy — usada em citações ("iniciado em 02/02/2026"). */
export function dataCurta(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** 1 → "I", 2 → "II", … (números de tomo). */
export function intParaRomano(n: number): string {
  const tabela: Array<[number, string]> = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"],
    [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"],
    [4, "IV"], [1, "I"],
  ];
  let resto = n;
  let out = "";
  for (const [valor, simbolo] of tabela) {
    while (resto >= valor) {
      out += simbolo;
      resto -= valor;
    }
  }
  return out || "I";
}

/** Número do termo com 4 dígitos: 1 → "0001". */
export function formatNumeroTermo(n: number): string {
  return String(n).padStart(4, "0");
}

// ── Máquina de condição do membro ─────────────────────────────────────────────

/** Condição resultante derivada apenas do tipo do termo (quando determinística). */
const CONDICAO_POR_TIPO_TERMO: Partial<Record<TipoTermoRegistro, CondicaoMembro>> = {
  primeiras_promessas: "membro_primeiras_promessas",
  renovacao_promessas: "membro_consagrado",
  promessas_definitivas: "membro_definitivas",
  desligamento: "desligado",
  falecimento: "falecido",
};

export function condicaoPorTipoTermo(tipo: TipoTermoRegistro): CondicaoMembro | undefined {
  return CONDICAO_POR_TIPO_TERMO[tipo];
}

// ── Mapeamento processo → termo ───────────────────────────────────────────────

export interface MapeamentoTermo {
  tipoTermo: TipoTermoRegistro;
  condicaoResultante?: CondicaoMembro;
  /** Campo de Organizacao com o nome da etapa, quando aplicável. */
  etapaCampo?: "termoPreDiscipulado" | "termoDiscipulado";
}

/**
 * Mapeia a conclusão de um ProcessoEclesiastico para o termo a ser lavrado.
 * Retorna null para tipos que não geram termo automático.
 */
export function mapProcessoParaTermo(
  tipo: TipoProcessoEclesiastico
): MapeamentoTermo | null {
  switch (tipo) {
    case "admissao_etapa1":
      return { tipoTermo: "admissao_etapa", condicaoResultante: "membro_em_experiencia", etapaCampo: "termoPreDiscipulado" };
    case "admissao_etapa2":
      return { tipoTermo: "admissao_etapa", condicaoResultante: "membro_em_formacao", etapaCampo: "termoDiscipulado" };
    case "promessas_iniciais":
      return { tipoTermo: "primeiras_promessas", condicaoResultante: "membro_primeiras_promessas" };
    case "renovacao_promessas":
      return { tipoTermo: "renovacao_promessas", condicaoResultante: "membro_consagrado" };
    case "promessas_definitivas":
      return { tipoTermo: "promessas_definitivas", condicaoResultante: "membro_definitivas" };
    case "ministerio":
      return { tipoTermo: "ministerio" };
    case "missao":
      return { tipoTermo: "missao" };
    case "transferencia":
      return { tipoTermo: "transferencia" };
    case "licenca":
      return { tipoTermo: "licenca_inicio" };
    case "desligamento":
      return { tipoTermo: "desligamento", condicaoResultante: "desligado" };
    case "falecimento":
      return { tipoTermo: "falecimento", condicaoResultante: "falecido" };
    default:
      return null;
  }
}

// ── Fórmulas fixas parametrizadas ─────────────────────────────────────────────

const CONDICAO_FRASE: Record<CondicaoMembro, string> = {
  candidato:                  "Candidato",
  membro_em_experiencia:      "Membro em Experiência",
  membro_em_formacao:         "Membro em Formação",
  membro_primeiras_promessas: "Membro de Primeiras Promessas",
  membro_consagrado:          "Membro Consagrado",
  membro_definitivas:         "Membro de Promessas Definitivas",
  desligado:                  "membro desligado",
  falecido:                   "falecido",
};

export interface ContextoFormula {
  formandoNome: string;
  dataEvento: Date;
  etapaNome?: string;
  processoCodigo?: string;
  promessaRef?: string;
  numeroRenovacao?: number;
  vigenciaFim?: Date | null;
  ministerioNome?: string;
  destino?: string;
  motivo?: string;
  prazoMeses?: number;
  autoridade?: string;
  localFalecimento?: string;
  retificaTermoNumero?: number;
  retificaDescricao?: string;
  condicaoResultante?: CondicaoMembro;
}

function fraseCondicao(c?: CondicaoMembro): string {
  if (!c) return "";
  return ` Passa o(a) mesmo(a) à condição de ${CONDICAO_FRASE[c]}.`;
}

function refProcesso(codigo?: string): string {
  return codigo
    ? `, conforme processo eclesiástico nº ${codigo}, aprovado pelo governo da comunidade`
    : ", conforme processo eclesiástico aprovado pelo governo da comunidade";
}

/** Monta o corpo (texto imutável) do termo a partir do tipo + contexto. */
export function montarCorpoTermo(tipo: TipoTermoRegistro, ctx: ContextoFormula): string {
  const data = dataPorExtenso(ctx.dataEvento);
  const nome = ctx.formandoNome;
  const promessa = ctx.promessaRef ? ` Reporta-se a ${ctx.promessaRef}.` : "";

  switch (tipo) {
    case "admissao_etapa":
      return `${data}, deferido o pedido de ingresso de ${nome}, é o(a) mesmo(a) admitido(a) ao ${ctx.etapaNome ?? "—"}${refProcesso(ctx.processoCodigo)}.${fraseCondicao(ctx.condicaoResultante)}`;

    case "conclusao_etapa":
      return `${data}, ${nome} conclui o ${ctx.etapaNome ?? "—"}, tendo cumprido o itinerário previsto e participado do retiro de encerramento.`;

    case "primeiras_promessas":
      return `${data}, ${nome} emitiu suas Primeiras Promessas${ctx.vigenciaFim ? `, com vigência temporária até ${dataCurta(ctx.vigenciaFim)}` : ""}.${promessa}${fraseCondicao(ctx.condicaoResultante)}`;

    case "renovacao_promessas":
      return `${data}, renovou ${nome} suas promessas${ctx.numeroRenovacao ? ` (${ctx.numeroRenovacao}ª renovação)` : ""}${ctx.vigenciaFim ? `, com vigência até ${dataCurta(ctx.vigenciaFim)}` : ""}.${promessa}${fraseCondicao(ctx.condicaoResultante)}`;

    case "promessas_definitivas":
      return `${data}, emitiu ${nome} suas Promessas Definitivas, de caráter perpétuo (sem termo de vigência).${promessa}${fraseCondicao(ctx.condicaoResultante)}`;

    case "ministerio":
      return `${data}, recebeu ${nome} o ministério de ${ctx.ministerioNome ?? "—"}, conforme carta de designação do governo da comunidade.`;

    case "missao":
      return `${data}, foi ${nome} enviado(a) em missão${ctx.destino ? ` a ${ctx.destino}` : ""}, conforme Carta de Missão expedida pelo Moderador Geral${ctx.prazoMeses ? `, com prazo previsto de ${ctx.prazoMeses} meses` : ""}.`;

    case "transferencia":
      return `${data}, foi ${nome} transferido(a)${ctx.destino ? ` para ${ctx.destino}` : ""}, conforme Carta de Transferência.`;

    case "licenca_inicio":
      return `${data}, foi concedida a ${nome} licença da vida comunitária${ctx.motivo ? `, por motivo de ${ctx.motivo}` : ""}, a seu requerimento${ctx.prazoMeses ? `, pelo prazo de ${ctx.prazoMeses} meses` : ""}, deferida pelo governo da comunidade.`;

    case "licenca_termino":
      return `${data}, encerra-se a licença concedida a ${nome}, que retorna à plena vida comunitária.`;

    case "desligamento":
      return `${data}, ${nome} é desligado(a) do quadro de membros da comunidade${ctx.motivo ? `, em decorrência de ${ctx.motivo}` : ""}, cessando seus vínculos formativos.`;

    case "dispensa":
      return `${data}, foi concedida a ${nome} a dispensa de suas promessas${ctx.autoridade ? ` pela autoridade competente (${ctx.autoridade})` : ""}.${promessa}`;

    case "falecimento":
      return `${data}, faleceu, em comunhão com a comunidade, ${nome}${ctx.localFalecimento ? `, em ${ctx.localFalecimento}` : ""}. Encerram-se com este os assentos relativos ao(à) interessado(a). Requiescat in pace.`;

    case "retificacao":
      return `Retifica-se o Termo nº ${ctx.retificaTermoNumero ? formatNumeroTermo(ctx.retificaTermoNumero) : "____"}${ctx.retificaDescricao ? `, ${ctx.retificaDescricao}` : ""}. A retificação não altera nem suprime o termo original, que permanece íntegro; este termo a ele se reporta para todos os efeitos.`;

    default:
      return "";
  }
}

// ── Termo de Abertura / Encerramento do tomo ──────────────────────────────────

const TITULO_LIVRO = "Livro de Registro Geral da Jornada Vocacional";

export function montarTextoAbertura(opts: {
  numeroTomo: number;
  totalFolhas: number;
}): string {
  const romano = intParaRomano(opts.numeroTomo);
  const ext = FOLHAS_EXTENSO[opts.totalFolhas];
  const folhas = ext ? `${opts.totalFolhas} (${ext})` : String(opts.totalFolhas);
  return `Este livro, sob o título ${TITULO_LIVRO}, Tomo ${romano}, contém ${folhas} folhas, numeradas e rubricadas, e destina-se ao assento cronológico de todos os atos relativos à jornada formativa dos candidatos e membros desta organização, desde o ingresso no período vocacional até o desligamento ou falecimento. Vai por mim aberto, numerado e encerrado nos termos do regimento interno e da praxe canônica.`;
}

export function montarTextoEncerramento(opts: {
  numeroTomo: number;
  totalFolhas: number;
  primeiroTermo: number | null;
  ultimoTermo: number | null;
}): string {
  const romano = intParaRomano(opts.numeroTomo);
  const proximo = intParaRomano(opts.numeroTomo + 1);
  const faixa =
    opts.primeiroTermo && opts.ultimoTermo
      ? `os termos de nº ${formatNumeroTermo(opts.primeiroTermo)} a nº ${formatNumeroTermo(opts.ultimoTermo)}`
      : "os termos nele lavrados";
  return `Encerra-se o presente Tomo ${romano} do ${TITULO_LIVRO}, contendo ${opts.totalFolhas} folhas e ${faixa}, todos por mim conferidos. Os assentos subsequentes terão prosseguimento no Tomo ${proximo}.`;
}

// ── Lavratura do termo (append-only) ──────────────────────────────────────────

export class LivroError extends Error {
  constructor(public code: "NENHUM_TOMO_ABERTO", message: string) {
    super(message);
    this.name = "LivroError";
  }
}

export interface LavrarTermoParams {
  organizacaoId: string;
  tipo: TipoTermoRegistro;
  formandoId?: string | null;
  dataEvento: Date;
  contexto: ContextoFormula;
  condicaoResultante?: CondicaoMembro;
  // Referências fracas
  processoId?: string | null;
  registroPromessaId?: string | null;
  arquivoRefId?: string | null;
  retificaTermoId?: string | null;
  criadoPorId?: string | null;
  lavradoAutomaticamente?: boolean;
}

/**
 * Lavra um termo no tomo aberto da organização (append-only, imutável).
 * Deve rodar dentro de uma transação. Lança LivroError se não houver tomo aberto.
 * A numeração sequencial por tomo é garantida pelo índice único (tomoId, numero):
 * em corrida concorrente, o segundo INSERT recebe P2002 e o chamador deve repetir.
 */
export async function lavrarTermo(
  tx: Prisma.TransactionClient,
  params: LavrarTermoParams
) {
  const tomo = await tx.livroRegistroTomo.findFirst({
    where: { organizacaoId: params.organizacaoId, status: "aberto" },
    select: { id: true },
  });
  if (!tomo) {
    throw new LivroError(
      "NENHUM_TOMO_ABERTO",
      "Nenhum tomo do Livro de Registro está aberto. Abra um tomo antes de lavrar termos."
    );
  }

  const agg = await tx.termoRegistro.aggregate({
    where: { tomoId: tomo.id },
    _max: { numero: true },
  });
  const numero = (agg._max.numero ?? 0) + 1;

  const condicao =
    params.condicaoResultante ?? condicaoPorTipoTermo(params.tipo);

  const corpoTexto = montarCorpoTermo(params.tipo, {
    ...params.contexto,
    condicaoResultante: condicao,
  });

  const termo = await tx.termoRegistro.create({
    data: {
      organizacaoId: params.organizacaoId,
      tomoId: tomo.id,
      numero,
      tipo: params.tipo,
      formandoId: params.formandoId ?? null,
      dataEvento: params.dataEvento,
      corpoTexto,
      condicaoResultante: condicao ?? null,
      processoId: params.processoId ?? null,
      registroPromessaId: params.registroPromessaId ?? null,
      arquivoRefId: params.arquivoRefId ?? null,
      retificaTermoId: params.retificaTermoId ?? null,
      lavradoAutomaticamente: params.lavradoAutomaticamente ?? true,
      criadoPorId: params.criadoPorId ?? null,
    },
  });

  // Atualiza a condição corrente do membro quando o ato a altera.
  if (condicao && params.formandoId) {
    await tx.formando.update({
      where: { id: params.formandoId },
      data: { condicaoAtual: condicao },
    });
  }

  return termo;
}
