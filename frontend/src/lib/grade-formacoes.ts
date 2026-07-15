import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { GradeFormacaoInputSchema } from "@/lib/schemas";

type GradeFormacaoInput = z.infer<typeof GradeFormacaoInputSchema>;

const EIXO_HEX = ["#6366F1", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"];

/**
 * Sincroniza os eixos da grade como PROJEÇÃO ESTÁVEL dos eixos do plano.
 *
 * Regra de negócio: a grade NUNCA cria eixos próprios — usa única e
 * exclusivamente os eixos cadastrados no plano formativo (`EixoPlano`),
 * identificados por `eixoPlanoId`. Aqui:
 *  - cada `EixoPlano` vira/atualiza um `Eixo` da grade (upsert por eixoPlanoId,
 *    PRESERVANDO o id → o vínculo das formações não se quebra entre saves, ao
 *    contrário do antigo delete-recria que trocava todos os ids a cada edição);
 *  - eixos da grade sem correspondência no plano (legado de texto livre com
 *    eixoPlanoId nulo, ou eixos que o plano deixou de ter) são removidos;
 *  - formações sob eixos removidos NÃO são apagadas: caem para "avulsas"
 *    (eixoId resolvido para null adiante) e permanecem visíveis.
 *
 * Retorna o mapa eixoPlanoId → eixoId (real da grade) para resolver formações.
 */
export async function syncGradeEixos(
  tx: Prisma.TransactionClient,
  opts: { gradeId: string; planoId: string },
): Promise<Map<string, string>> {
  const { gradeId, planoId } = opts;

  const [eixosPlano, eixosGrade] = await Promise.all([
    tx.eixoPlano.findMany({ where: { planoId }, orderBy: { ordem: "asc" } }),
    tx.eixo.findMany({ where: { gradeId } }),
  ]);

  const planoIds = new Set(eixosPlano.map((e) => e.id));
  const gradeByPlano = new Map(
    eixosGrade.filter((e) => e.eixoPlanoId).map((e) => [e.eixoPlanoId!, e]),
  );

  // Remove eixos da grade que não correspondem a nenhum eixo atual do plano.
  // Etapas caem por cascade; formações órfãs são preservadas (viram avulsas).
  const orphan = eixosGrade
    .filter((e) => !e.eixoPlanoId || !planoIds.has(e.eixoPlanoId))
    .map((e) => e.id);
  if (orphan.length > 0) {
    await tx.eixo.deleteMany({ where: { id: { in: orphan } } });
  }

  const map = new Map<string, string>();
  for (const [i, ep] of eixosPlano.entries()) {
    const cor = EIXO_HEX[i % EIXO_HEX.length];
    const existing = gradeByPlano.get(ep.id);
    if (existing) {
      await tx.eixo.update({
        where: { id: existing.id },
        data: { nome: ep.nome, descricao: ep.objetivo, ordem: ep.ordem, cor: existing.cor ?? cor },
      });
      map.set(ep.id, existing.id);
    } else {
      const created = await tx.eixo.create({
        data: { gradeId, nome: ep.nome, descricao: ep.objetivo, ordem: ep.ordem, cor, eixoPlanoId: ep.id },
        select: { id: true },
      });
      map.set(ep.id, created.id);
    }
  }
  return map;
}

/**
 * Reconcilia as formações da grade PELO ID — nunca "apaga tudo e recria pelo
 * nome". O cliente reenvia toda formação existente com seu `id`; assim só o que
 * ele omite EXPLICITAMENTE (o usuário removeu na tela) é soft-deletado. Renomear
 * ou remover um eixo no plano jamais faz uma formação sumir em silêncio.
 *
 *  - incoming com id existente → update (PRESERVA o id → mantém agendamentos)
 *  - incoming sem id / id desconhecido → create
 *  - existente ausente do payload → soft-delete
 *
 * `eixoId` é resolvido do `eixoPlanoId` via `eixoByPlano`. Formação sem
 * `eixoPlanoId` (grade sem eixos, ou órfã de eixo removido do plano) fica
 * avulsa (eixoId nulo), preservada e visível. `numero` é sequencial na ordem.
 */
export async function reconcileGradeFormacoes(
  tx: Prisma.TransactionClient,
  opts: {
    gradeId: string;
    gradeNome: string;
    organizacaoId: string;
    nivelFormativo: string;
    formacoes: GradeFormacaoInput[];
    eixoByPlano: Map<string, string>;
  },
): Promise<void> {
  const { gradeId, gradeNome, organizacaoId, nivelFormativo, formacoes, eixoByPlano } = opts;

  const existing = await tx.formacao.findMany({
    where: { gradeId, organizacaoId, deletedAt: null },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((f) => f.id));
  const kept = new Set<string>();
  const toCreate: Prisma.FormacaoCreateManyInput[] = [];

  for (const [i, f] of formacoes.entries()) {
    const eixoId = f.eixoPlanoId ? eixoByPlano.get(f.eixoPlanoId) ?? null : null;
    // Campos que espelham o estado atual da grade (propaga rename de grade/nível)
    const content = {
      tema: f.tema.trim(),
      objetivo: f.objetivo?.trim() ?? "",
      descricao: f.descricao?.trim() ?? "",
      nivelFormativo,
      eixoId,
      eixoNome: f.eixoNome ?? null,
      cargaHoraria: f.cargaHoraria ?? 2,
      modalidade: f.modalidade ?? "presencial",
      gradeNome,
      numero: i + 1,
      observacoesFormador: f.observacoesFormador?.trim() || null,
    };
    if (f.id && existingIds.has(f.id)) {
      kept.add(f.id);
      await tx.formacao.update({ where: { id: f.id }, data: content });
    } else {
      toCreate.push({
        organizacaoId,
        tipoFormacao: "comunitaria",
        formadorNome: "",
        gradeId,
        ...content,
      });
    }
  }

  const toDelete = [...existingIds].filter((id) => !kept.has(id));
  if (toDelete.length > 0) {
    await tx.formacao.updateMany({ where: { id: { in: toDelete } }, data: { deletedAt: new Date() } });
  }
  if (toCreate.length > 0) {
    await tx.formacao.createMany({ data: toCreate });
  }
}
