import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** True se o erro é uma violação de unique constraint (P2002) do Prisma. */
export function isP2002(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/** Colunas envolvidas no P2002 (target), ou [] se indisponível. */
export function p2002Target(e: Prisma.PrismaClientKnownRequestError): string[] {
  return Array.isArray(e.meta?.target) ? (e.meta.target as string[]) : [];
}

/**
 * Executa `txFn` numa transação, reexecutando em colisão de numeração de termo
 * (P2002 na corrida de Tomo/Folha) até `tentativas` vezes.
 *
 * `naoRetentar` permite abortar cedo num P2002 que é **permanente** (ex.: unique
 * de negócio como `formandoId`), deixando o erro propagar imediatamente ao caller
 * — que então o traduz para a resposta apropriada. Centraliza o loop antes
 * duplicado nas rotas do vocacional (inscrição + cancelamento + encerramento).
 */
export async function lavrarComRetry<T>(
  txFn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts: { tentativas?: number; naoRetentar?: (e: Prisma.PrismaClientKnownRequestError) => boolean } = {},
): Promise<T> {
  const max = opts.tentativas ?? 4;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await prisma.$transaction(txFn);
    } catch (e) {
      if (isP2002(e) && attempt < max - 1 && !opts.naoRetentar?.(e)) continue;
      throw e;
    }
  }
  // Inalcançável: a última tentativa sempre retorna ou lança.
  throw new Error("lavrarComRetry: tentativas esgotadas");
}
