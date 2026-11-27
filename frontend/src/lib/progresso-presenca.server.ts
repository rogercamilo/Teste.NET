/**
 * Persistência do progresso da etapa derivado de presença (server-only — importa
 * Prisma). A regra de classificação vive em `progresso-presenca` (puro). Mantido
 * separado para não arrastar o Prisma para o bundle do cliente.
 */
import { prisma } from "@/lib/prisma";
import { classificarEventoProgresso, type ContagemRealizados } from "@/lib/progresso-presenca";

/**
 * Recalcula e persiste os contadores de formação/retiro comunitário de cada
 * formando a partir das suas presenças ("presente"), agrupadas pelo nível do
 * evento — de modo que cada presença alimente a ProgressoEtapa do nível correto
 * (robusto a promoções de etapa). Preserva `retirosPessoaisRealizados` e as datas.
 *
 * Idempotente: pode ser chamada após qualquer gravação de presença e como
 * backfill. Falhas não devem derrubar a gravação de presença (chamador trata).
 */
export async function recomputeProgressoPresenca(
  organizacaoId: string,
  formandoIds: string[]
): Promise<void> {
  const ids = [...new Set(formandoIds)].filter(Boolean);
  if (ids.length === 0) return;

  const [presencas, rows] = await Promise.all([
    prisma.presencaFormacao.findMany({
      where: { formandoId: { in: ids }, organizacaoId, statusFormador: "presente" },
      select: { formandoId: true, agendamento: { select: { tipoEvento: true, nivelFormativo: true } } },
    }),
    prisma.progressoEtapa.findMany({
      where: { formandoId: { in: ids } },
      select: { formandoId: true, nivelFormativo: true },
    }),
  ]);

  // formandoId → (nível do evento → contagem)
  const porFormando = new Map<string, Map<string, ContagemRealizados>>();
  for (const p of presencas) {
    if (!p.agendamento) continue;
    const classe = classificarEventoProgresso(p.agendamento.tipoEvento);
    if (!classe) continue;
    const nivel = p.agendamento.nivelFormativo;
    let porNivel = porFormando.get(p.formandoId);
    if (!porNivel) {
      porNivel = new Map();
      porFormando.set(p.formandoId, porNivel);
    }
    let c = porNivel.get(nivel);
    if (!c) {
      c = { formacoesComunitariasRealizadas: 0, retirosComunitariosRealizados: 0 };
      porNivel.set(nivel, c);
    }
    if (classe === "formacao") c.formacoesComunitariasRealizadas++;
    else c.retirosComunitariosRealizados++;
  }

  // Níveis a (re)escrever por formando: os que já têm linha ∪ os que têm presença.
  // Incluir os já existentes garante zerar um contador quando a presença é desfeita.
  const niveisPorFormando = new Map<string, Set<string>>();
  const push = (fid: string, nivel: string) => {
    let s = niveisPorFormando.get(fid);
    if (!s) {
      s = new Set();
      niveisPorFormando.set(fid, s);
    }
    s.add(nivel);
  };
  for (const r of rows) push(r.formandoId, r.nivelFormativo);
  for (const [fid, porNivel] of porFormando) for (const nivel of porNivel.keys()) push(fid, nivel);

  const ZERO: ContagemRealizados = { formacoesComunitariasRealizadas: 0, retirosComunitariosRealizados: 0 };
  const ops: ReturnType<typeof prisma.progressoEtapa.upsert>[] = [];
  for (const [fid, niveis] of niveisPorFormando) {
    const porNivel = porFormando.get(fid);
    for (const nivel of niveis) {
      const c = porNivel?.get(nivel) ?? ZERO;
      ops.push(
        prisma.progressoEtapa.upsert({
          where: { formandoId_nivelFormativo: { formandoId: fid, nivelFormativo: nivel } },
          create: {
            formandoId: fid,
            nivelFormativo: nivel,
            formacoesComunitariasRealizadas: c.formacoesComunitariasRealizadas,
            retirosComunitariosRealizados: c.retirosComunitariosRealizados,
          },
          update: {
            formacoesComunitariasRealizadas: c.formacoesComunitariasRealizadas,
            retirosComunitariosRealizados: c.retirosComunitariosRealizados,
          },
        })
      );
    }
  }
  if (ops.length > 0) await prisma.$transaction(ops);
}
