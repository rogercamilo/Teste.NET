import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { GradeFormacaoInputSchema } from "@/lib/schemas";

type GradeFormacaoInput = z.infer<typeof GradeFormacaoInputSchema>;

/**
 * Substitui, de forma ATÔMICA, o conjunto de formações de uma grade formativa.
 *
 * Antes, o navegador criava cada formação num POST separado (e, na edição,
 * apagava as antigas uma a uma). Um lote grande (ex.: 75 formações) estourava o
 * rate-limit de mutação (60/min) e as requisições excedentes voltavam 429 — que
 * o cliente ignorava silenciosamente, exibindo "sucesso" enquanto os dados eram
 * perdidos. Aqui tudo acontece dentro da MESMA transação da grade: as antigas
 * são soft-deletadas e as novas criadas em uma única operação, all-or-nothing.
 *
 * O `eixoId` real é resolvido a partir do `eixoPlanoId` (via os eixos já
 * (re)criados da grade). `numero` é sequencial na ordem recebida. Formador não é
 * vinculado — a grade é um template estrutural.
 */
export async function replaceGradeFormacoes(
  tx: Prisma.TransactionClient,
  opts: {
    gradeId: string;
    gradeNome: string;
    organizacaoId: string;
    nivelFormativo: string;
    formacoes: GradeFormacaoInput[];
  },
): Promise<void> {
  const { gradeId, gradeNome, organizacaoId, nivelFormativo, formacoes } = opts;

  // Remove (soft-delete) as formações atuais desta grade. Soft-delete preserva a
  // integridade referencial de eventuais agendamentos que apontem para elas.
  await tx.formacao.updateMany({
    where: { gradeId, organizacaoId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (formacoes.length === 0) return;

  // Mapa eixoPlanoId → eixoId (real) a partir dos eixos vigentes da grade.
  const eixos = await tx.eixo.findMany({
    where: { gradeId, eixoPlanoId: { not: null } },
    select: { id: true, eixoPlanoId: true },
  });
  const eixoByPlano = new Map(eixos.map((e) => [e.eixoPlanoId, e.id]));

  await tx.formacao.createMany({
    data: formacoes.map((f, i) => ({
      organizacaoId,
      tema: f.tema.trim(),
      objetivo: f.objetivo?.trim() ?? "",
      descricao: f.descricao?.trim() ?? "",
      nivelFormativo,
      tipoFormacao: "comunitaria",
      eixoId: f.eixoPlanoId ? eixoByPlano.get(f.eixoPlanoId) ?? null : null,
      eixoNome: f.eixoNome ?? null,
      formadorNome: "",
      cargaHoraria: f.cargaHoraria ?? 2,
      modalidade: f.modalidade ?? "presencial",
      gradeId,
      gradeNome,
      numero: i + 1,
      observacoesFormador: f.observacoesFormador?.trim() || null,
    })),
  });
}
