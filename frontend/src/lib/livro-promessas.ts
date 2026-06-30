import type { Prisma } from "@prisma/client";
import type { TipoProcessoEclesiastico, TipoRegistroPromessa } from "@/types";
import { TIPO_REGISTRO_PROMESSA_LABELS } from "@/types";
import { formatNumeroTermo } from "@/lib/livro-registro";

export { TIPO_REGISTRO_PROMESSA_LABELS } from "@/types";

/** Tomo padrão do Livro de Promessas (campo plano em RegistroPromessa). */
export const TOMO_PROMESSAS_PADRAO = "I";

// ── Mapeamento processo → tipo de promessa ────────────────────────────────────

/**
 * Mapeia o tipo de ProcessoEclesiastico para o tipo de RegistroPromessa a ser
 * lavrado no Livro de Promessas. Retorna null para processos que não geram
 * registro de promessa (admissões, ministério, etc.).
 */
export function mapProcessoParaTipoPromessa(
  tipo: TipoProcessoEclesiastico
): TipoRegistroPromessa | null {
  switch (tipo) {
    case "promessas_iniciais":
      return "iniciais_temporarias";
    case "renovacao_promessas":
      return "renovacao";
    case "promessas_definitivas":
      return "definitivas";
    default:
      return null;
  }
}

/** True se o processo culmina numa promessa registrável no Livro de Promessas. */
export function processoGeraPromessa(tipo: TipoProcessoEclesiastico): boolean {
  return mapProcessoParaTipoPromessa(tipo) !== null;
}

// ── Redação da fórmula de consagração ─────────────────────────────────────────

export interface ContextoFormulaPromessa {
  formandoNome: string;
  orgNome: string;
  tipo: TipoRegistroPromessa;
  /** Rótulo do tipo de promessa p/ a redação (ex.: nome configurável da org). */
  tipoLabel?: string;
  /** Texto de vigência p/ promessas temporárias (ex.: "um ano"). */
  periodoVigencia?: string;
}

/**
 * Fórmula canônica default de consagração — espelha a redação do template
 * `documentos-eclesiasticos/templates/termo-consagracao.tsx`. Editável pelo
 * admin no momento da lavratura.
 */
export function montarFormulaPromessa(ctx: ContextoFormulaPromessa): string {
  const isDefinitivas = ctx.tipo === "definitivas";
  const label = ctx.tipoLabel ?? TIPO_REGISTRO_PROMESSA_LABELS[ctx.tipo];
  const vigencia = isDefinitivas
    ? "sem prazo determinado, renovando-se perpetuamente"
    : `por um período de ${ctx.periodoVigencia ?? "um ano"}, a contar da data da celebração`;
  return `Eu, ${ctx.formandoNome}, diante de Deus e desta comunidade reunida em Seu nome, livremente me consagro a Ele por meio de ${label} em ${ctx.orgNome}, comprometendo-me a viver o carisma e a missão desta comunidade com fidelidade, ${vigencia}.`;
}

// ── Cláusula referencial p/ o Livro de Registro Geral ─────────────────────────

/**
 * Monta a string referencial do termo do Livro Geral que aponta o assento no
 * Livro de Promessas: "Livro de Promessas, Tomo I, Folha 001, Registro nº 0001".
 */
export function montarRefPromessa(reg: {
  tomo: string;
  folha: number;
  numeroRegistro: string;
}): string {
  return `Livro de Promessas, Tomo ${reg.tomo}, Folha ${String(reg.folha).padStart(3, "0")}, Registro nº ${reg.numeroRegistro}`;
}

// ── Lavratura do registro (append-only) ───────────────────────────────────────

export interface LavrarRegistroPromessaParams {
  organizacaoId: string;
  formandoId: string;
  processoId: string;
  tipo: TipoRegistroPromessa;
  tomo?: string;
  dataVigenciaInicio: Date;
  dataVigenciaFim?: Date | null;
  formulaTexto: string;
  celebrante: string;
  localCelebracao: string;
  moderadorGeral: string;
  formadorGeralLocal?: string | null;
  assistenteEclesiastico?: string | null;
  secretario: string;
  criadoPorId?: string | null;
}

/**
 * Lavra um registro no Livro de Promessas (append-only). Deve rodar dentro de
 * uma transação. A numeração sequencial por org+tomo é garantida pelo índice
 * único (organizacaoId, tomo, numero): numa corrida concorrente o segundo
 * INSERT recebe P2002 e o chamador deve repetir (ver lib/livro-retry.ts).
 *
 * Idempotente: como `processoId` é único, se já existe um registro para o
 * processo ele é retornado sem reinserir (permite reconclusão segura).
 */
export async function lavrarRegistroPromessa(
  tx: Prisma.TransactionClient,
  params: LavrarRegistroPromessaParams
) {
  const existente = await tx.registroPromessa.findUnique({
    where: { processoId: params.processoId },
  });
  if (existente) return existente;

  const tomo = params.tomo ?? TOMO_PROMESSAS_PADRAO;

  const agg = await tx.registroPromessa.aggregate({
    where: { organizacaoId: params.organizacaoId, tomo },
    _max: { numero: true },
  });
  const numero = (agg._max.numero ?? 0) + 1;
  const numeroRegistro = formatNumeroTermo(numero); // "0001"
  // Cada consagração é um ato solene de página inteira: um assento por folha.
  const folha = numero;

  return tx.registroPromessa.create({
    data: {
      organizacaoId: params.organizacaoId,
      formandoId: params.formandoId,
      processoId: params.processoId,
      tipo: params.tipo,
      tomo,
      numero,
      numeroRegistro,
      folha,
      dataVigenciaInicio: params.dataVigenciaInicio,
      dataVigenciaFim: params.dataVigenciaFim ?? null,
      formulaTexto: params.formulaTexto,
      celebrante: params.celebrante,
      localCelebracao: params.localCelebracao,
      moderadorGeral: params.moderadorGeral,
      formadorGeralLocal: params.formadorGeralLocal ?? null,
      assistenteEclesiastico: params.assistenteEclesiastico ?? null,
      secretario: params.secretario,
      criadoPorId: params.criadoPorId ?? null,
    },
  });
}
