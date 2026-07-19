import { prisma } from "@/lib/prisma";

// Lógica compartilhada de CRUD de leituras (livros + capítulos) de um grupo.
// A leitura vive no grupo (`LeituraVocacional.turmaId === GrupoFormacao.id`),
// independentemente do tipo do grupo — o mesmo motor serve a turma vocacional
// (Travessia) e os grupos de formação (leitura da jornada formativa). A
// AUTORIZAÇÃO fica nas rotas (guards distintos por contexto); aqui só está o
// acesso a dados, sempre escopado por turma + organização (anti-IDOR).

// Título + material formativo opcional por capítulo. Um só lugar define os
// campos, reusado no select do store E nos Server Components que carregam as
// leituras (page.tsx da turma e do grupo) — evita drift entre os selects.
export const capituloCampos = {
  id: true, numero: true, titulo: true, metaConclusao: true,
  objetivo: true, palavrasChave: true, comentarios: true,
  perguntas: true, acaoPratica: true, partilha: true,
} as const;

const capitulosSelect = {
  capitulos: { orderBy: { numero: "asc" as const }, select: capituloCampos },
};

/** Capítulo recebido do cliente: título + meta + material formativo opcional. */
export interface CapituloInput {
  titulo: string;
  metaConclusao?: string | null;
  objetivo?: string | null;
  palavrasChave?: string | null;
  comentarios?: string | null;
  perguntas?: string | null;
  acaoPratica?: string | null;
  partilha?: string | null;
}

// Normaliza um capítulo do cliente para a linha do banco (posição → numero;
// strings vazias/ausentes → null). Um só ponto de verdade para create e update.
function capituloParaLinha(c: CapituloInput, i: number) {
  return {
    numero: i + 1,
    titulo: c.titulo,
    metaConclusao: c.metaConclusao?.trim() || null,
    objetivo: c.objetivo?.trim() || null,
    palavrasChave: c.palavrasChave?.trim() || null,
    comentarios: c.comentarios?.trim() || null,
    perguntas: c.perguntas?.trim() || null,
    acaoPratica: c.acaoPratica?.trim() || null,
    partilha: c.partilha?.trim() || null,
  };
}

export function listLeituras(turmaId: string, organizacaoId: string) {
  return prisma.leituraVocacional.findMany({
    where: { turmaId, organizacaoId },
    orderBy: { ordem: "asc" },
    include: capitulosSelect,
  });
}

export async function createLeitura(
  turmaId: string,
  organizacaoId: string,
  data: { titulo: string; autor?: string | null; capaUrl?: string | null; capitulos: CapituloInput[] }
) {
  // Nova leitura entra ao fim da trilha da turma.
  const ultima = await prisma.leituraVocacional.findFirst({
    where: { turmaId, organizacaoId },
    orderBy: { ordem: "desc" },
    select: { ordem: true },
  });

  return prisma.leituraVocacional.create({
    data: {
      organizacaoId,
      turmaId,
      titulo: data.titulo,
      autor: data.autor || null,
      capaUrl: data.capaUrl || null,
      ordem: (ultima?.ordem ?? -1) + 1,
      capitulos: { create: data.capitulos.map(capituloParaLinha) },
    },
    include: capitulosSelect,
  });
}

/** Atualiza a leitura escopada por turma+org. Retorna null se não existir (IDOR). */
export async function updateLeitura(
  turmaId: string,
  organizacaoId: string,
  leituraId: string,
  data: { titulo?: string; autor?: string | null; capaUrl?: string | null; ordem?: number; ativo?: boolean; capitulos?: CapituloInput[] }
) {
  const existente = await prisma.leituraVocacional.findFirst({
    where: { id: leituraId, turmaId, organizacaoId },
    select: { id: true },
  });
  if (!existente) return null;

  await prisma.$transaction(async (tx) => {
    await tx.leituraVocacional.update({
      where: { id: leituraId },
      data: {
        ...(data.titulo !== undefined ? { titulo: data.titulo } : {}),
        ...(data.autor !== undefined ? { autor: data.autor || null } : {}),
        ...(data.capaUrl !== undefined ? { capaUrl: data.capaUrl || null } : {}),
        ...(data.ordem !== undefined ? { ordem: data.ordem } : {}),
        ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
      },
    });
    // Quando os capítulos vêm, substituem o conjunto e são renumerados 1..N.
    if (data.capitulos) {
      await tx.capituloLeitura.deleteMany({ where: { leituraId } });
      await tx.capituloLeitura.createMany({
        data: data.capitulos.map((c, i) => ({ leituraId, ...capituloParaLinha(c, i) })),
      });
    }
  });

  return prisma.leituraVocacional.findUnique({ where: { id: leituraId }, include: capitulosSelect });
}

/** Remove a leitura escopada por turma+org. Retorna false se não existir. */
export async function deleteLeitura(turmaId: string, organizacaoId: string, leituraId: string) {
  const existente = await prisma.leituraVocacional.findFirst({
    where: { id: leituraId, turmaId, organizacaoId },
    select: { id: true },
  });
  if (!existente) return false;
  await prisma.leituraVocacional.delete({ where: { id: leituraId } });
  return true;
}
