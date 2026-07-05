import { prisma } from "@/lib/prisma";

/** Uma partilha de um vocacionado, como o formador a vê no painel de progresso. */
export interface ProgressoPartilha {
  acaoId: string;
  livroTitulo: string;
  capituloNumero: number;
  texto: string;
  formadorCurtiu: boolean;
  formadorNota: string | null;
}

export interface ProgressoParticipante {
  formandoId: string;
  nome: string;
  capitulosLidos: number;
  percentual: number;
  frutos: number;
  partilhas: ProgressoPartilha[];
}

export interface TurmaTravessiaProgresso {
  totalCapitulos: number;
  participantes: ProgressoParticipante[];
}

// Participações que contam como "em curso" na turma (mesma régua do portal).
const STATUS_VOCACIONAL_ATIVOS = ["ativa", "aguardando_carta", "em_discernimento"] as const;

/**
 * Progresso da Trilha da Travessia de uma turma, para o formador acompanhar:
 * por participante ativo, quantos capítulos leu, quantos Frutos somou e as
 * partilhas textuais (com a reação já registrada). Escopado por org + turma —
 * só livros ATIVOS entram, espelhando o que o vocacionado vê no portal. Retorna
 * `null` quando a turma não tem livros cadastrados (nada a exibir).
 */
export async function getTurmaTravessiaProgresso(
  turmaId: string,
  organizacaoId: string
): Promise<TurmaTravessiaProgresso | null> {
  const livros = await prisma.leituraVocacional.findMany({
    where: { turmaId, organizacaoId, ativo: true },
    select: { id: true, titulo: true, _count: { select: { capitulos: true } } },
  });
  if (livros.length === 0) return null;

  const totalCapitulos = livros.reduce((s, l) => s + l._count.capitulos, 0);

  const participacoes = await prisma.participacaoVocacional.findMany({
    where: { turmaId, organizacaoId, status: { in: [...STATUS_VOCACIONAL_ATIVOS] } },
    select: { formando: { select: { id: true, nome: true } } },
    orderBy: { formando: { nome: "asc" } },
  });

  const formandoIds = participacoes.map((p) => p.formando.id);
  if (formandoIds.length === 0) {
    return { totalCapitulos, participantes: [] };
  }

  // Todas as ações desses vocacionados nos livros ATIVOS da turma.
  const acoes = await prisma.acaoLeitura.findMany({
    where: {
      organizacaoId,
      formandoId: { in: formandoIds },
      leitura: { turmaId, ativo: true },
    },
    select: {
      id: true,
      formandoId: true,
      tipo: true,
      frutos: true,
      texto: true,
      formadorCurtiu: true,
      formadorNota: true,
      leitura: { select: { titulo: true } },
      capitulo: { select: { numero: true } },
    },
    orderBy: { criadoEm: "asc" },
  });

  const porFormando = new Map<string, { lidos: number; frutos: number; partilhas: ProgressoPartilha[] }>();
  for (const id of formandoIds) porFormando.set(id, { lidos: 0, frutos: 0, partilhas: [] });

  for (const a of acoes) {
    const agg = porFormando.get(a.formandoId);
    if (!agg) continue;
    agg.frutos += a.frutos;
    if (a.tipo === "leitura") {
      agg.lidos += 1;
    } else if (a.tipo === "partilha" && a.texto) {
      agg.partilhas.push({
        acaoId: a.id,
        livroTitulo: a.leitura.titulo,
        capituloNumero: a.capitulo?.numero ?? 0,
        texto: a.texto,
        formadorCurtiu: a.formadorCurtiu,
        formadorNota: a.formadorNota,
      });
    }
  }

  const participantes: ProgressoParticipante[] = participacoes.map((p) => {
    const agg = porFormando.get(p.formando.id)!;
    return {
      formandoId: p.formando.id,
      nome: p.formando.nome,
      capitulosLidos: agg.lidos,
      percentual: totalCapitulos > 0 ? Math.round((agg.lidos / totalCapitulos) * 100) : 0,
      frutos: agg.frutos,
      partilhas: agg.partilhas,
    };
  });

  return { totalCapitulos, participantes };
}
