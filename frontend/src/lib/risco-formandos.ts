import "server-only";

import { prisma } from "./prisma";
import { avaliarRiscoFormando, decidirAcaoRisco } from "./jornada-progresso";
import { formadorDoGrupo, criarNotificacao } from "./notificacoes";
import { sendFormandosEmRiscoEmail } from "./email";
import { logError } from "./audit-log";
import type { NivelFormativo, ProgressoEtapa } from "@/types";

/**
 * Detecção proativa de formandos em risco (item 3.3).
 *
 * Cron de PLATAFORMA (varre todas as orgs, como o security-alerts): avalia cada
 * formando ativo com a MESMA régua da aba Jornada (`avaliarRiscoFormando`) e, via
 * `decidirAcaoRisco`, decide alertar / resetar / nada — anti-spam pela coluna
 * `Formando.riscoAlertadoEm`. Alertas são agrupados por grupo e entregues ao
 * Formador Comunitário responsável por bell + e-mail digest.
 */

const DIAS_PRESENCA = 90;

export interface RiscoSummary {
  formandosAvaliados: number;
  alertados: number;
  recuperados: number;
  gruposNotificados: number;
  emails: number;
}

export async function checkFormandosEmRisco(now: Date = new Date()): Promise<RiscoSummary> {
  const summary: RiscoSummary = {
    formandosAvaliados: 0,
    alertados: 0,
    recuperados: 0,
    gruposNotificados: 0,
    emails: 0,
  };

  const formandos = await prisma.formando.findMany({
    where: { ativo: true, deletedAt: null, grupoFormacaoId: { not: null } },
    select: {
      id: true,
      nome: true,
      organizacaoId: true,
      grupoFormacaoId: true,
      nivelFormativo: true,
      riscoAlertadoEm: true,
      progressoEtapas: {
        select: {
          nivelFormativo: true,
          formacoesComunitariasRealizadas: true,
          retirosComunitariosRealizados: true,
          retirosPessoaisRealizados: true,
          iniciouEm: true,
        },
      },
    },
  });
  if (formandos.length === 0) return summary;

  // Presenças dos últimos 90 dias, agregadas por formando.
  const limite = new Date(now.getTime() - DIAS_PRESENCA * 86_400_000);
  const presencas = await prisma.presencaFormacao.findMany({
    where: { formandoId: { in: formandos.map((f) => f.id) }, data: { gte: limite } },
    select: { formandoId: true, data: true, presente: true, statusFormador: true },
  });
  const presMap = new Map<string, { formandoId: string; data: string; presente: boolean; statusFormador: string | null }[]>();
  for (const p of presencas) {
    const arr = presMap.get(p.formandoId) ?? [];
    arr.push({ formandoId: p.formandoId, data: p.data.toISOString(), presente: p.presente, statusFormador: p.statusFormador });
    presMap.set(p.formandoId, arr);
  }

  // Acumula os que devem ser alertados, por grupo.
  const porGrupo = new Map<string, { organizacaoId: string; membros: { nome: string; motivos: string[] }[] }>();

  for (const f of formandos) {
    summary.formandosAvaliados++;
    const prog = f.progressoEtapas.map(
      (p) =>
        ({
          nivel: p.nivelFormativo as NivelFormativo,
          formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas,
          retirosComunitariosRealizados: p.retirosComunitariosRealizados,
          retirosPessoaisRealizados: p.retirosPessoaisRealizados,
          iniciouEm: p.iniciouEm?.toISOString(),
        }) as ProgressoEtapa
    );

    const { emRisco, motivos } = avaliarRiscoFormando(
      { nivelFormativo: f.nivelFormativo as NivelFormativo, progressoEtapas: prog },
      presMap.get(f.id) ?? [],
      now,
      f.id
    );
    const acao = decidirAcaoRisco(emRisco, f.riscoAlertadoEm, now);

    if (acao === "resetar") {
      await prisma.formando
        .update({ where: { id: f.id }, data: { riscoAlertadoEm: null } })
        .catch((e) => logError("risco:reset", e, { id: f.id }));
      summary.recuperados++;
    } else if (acao === "alertar") {
      const entry = porGrupo.get(f.grupoFormacaoId!) ?? { organizacaoId: f.organizacaoId, membros: [] };
      entry.membros.push({ nome: f.nome, motivos });
      porGrupo.set(f.grupoFormacaoId!, entry);
      await prisma.formando
        .update({ where: { id: f.id }, data: { riscoAlertadoEm: now } })
        .catch((e) => logError("risco:flag", e, { id: f.id }));
      summary.alertados++;
    }
  }

  // Notifica o FC de cada grupo com alertas (bell + e-mail digest).
  for (const [grupoId, { organizacaoId, membros }] of porGrupo) {
    try {
      const fcId = await formadorDoGrupo(grupoId);
      if (!fcId) continue;
      const grupo = await prisma.grupoFormacao.findUnique({ where: { id: grupoId }, select: { nome: true } });
      const grupoNome = grupo?.nome ?? "grupo";
      const n = membros.length;

      await criarNotificacao({
        organizacaoId,
        destinatarioId: fcId,
        tipo: "formando_em_risco",
        titulo: `${n} membro${n > 1 ? "s" : ""} ${n > 1 ? "precisam" : "precisa"} de atenção`,
        corpo: membros.slice(0, 3).map((m) => m.nome).join(", ") + (n > 3 ? ` +${n - 3}` : ""),
        linkAcao: `/grupos-formacao/${grupoId}?tab=jornada`,
      }).catch(() => {});

      const fc = await prisma.usuario.findUnique({ where: { id: fcId }, select: { nome: true, email: true } });
      if (fc?.email) {
        const r = await sendFormandosEmRiscoEmail({
          organizacaoId,
          email: fc.email,
          nomeFormador: fc.nome,
          grupoNome,
          grupoId,
          membros,
        });
        if (r.sent) summary.emails++;
      }
      summary.gruposNotificados++;
    } catch (err) {
      logError("risco:notificar-grupo", err, { grupoId });
    }
  }

  return summary;
}
