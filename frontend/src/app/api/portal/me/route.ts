import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError } from "@/lib/audit-log";
import { REQUISITOS_ETAPAS } from "@/types";
import type { NivelFormativo } from "@/types";

export async function GET(request: Request) {
  const formandoId = request.headers.get("x-formando-id");
  const organizacaoId = request.headers.get("x-formando-org");

  if (!formandoId || !organizacaoId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    const formando = await prisma.formando.findFirst({
      where: { id: formandoId, organizacaoId, ativo: true, deletedAt: null },
      select: {
        id: true,
        nome: true,
        nivelFormativo: true,
        grupoFormacaoId: true,
        grupoFormacao: { select: { id: true, nome: true } },
      },
    });

    if (!formando) {
      return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
    }

    const nivel = formando.nivelFormativo as NivelFormativo;
    // C2 — wherePresenca reutilizado nas três queries de presença
    const wherePresenca = { formandoId, organizacaoId, nivelFormativo: nivel };
    const agora = new Date();

    // C6 — todas as queries independentes rodando em paralelo
    const [total, presentes, historico, proximosEncontros, progressoEtapa] =
      await Promise.all([
        // C2 — COUNT separado: percentual correto independente do limit do histórico
        prisma.presencaFormacao.count({ where: wherePresenca }),
        prisma.presencaFormacao.count({ where: { ...wherePresenca, presente: true } }),
        prisma.presencaFormacao.findMany({
          where: wherePresenca,
          select: {
            id: true,
            agendamentoId: true,
            data: true,
            formacaoTema: true,
            presente: true,
            justificativa: true,
            confirmacaoFormando: true,
            justificativaFormando: true,
            agendamento: { select: { tipoFormacao: true } },
          },
          orderBy: { data: "desc" },
          take: 100,
        }),
        formando.grupoFormacaoId
          ? prisma.agendamento.findMany({
              where: {
                grupoFormacaoId: formando.grupoFormacaoId,
                organizacaoId,
                dataInicio: { gte: agora },
                status: { not: "cancelada" },
                deletedAt: null,
              },
              select: {
                id: true,
                formacaoTema: true,
                tipoFormacao: true,
                dataInicio: true,
                dataFim: true,
                local: true,
              },
              orderBy: { dataInicio: "asc" },
              take: 5,
            })
          : Promise.resolve([]),
        prisma.progressoEtapa.findUnique({
          where: {
            formandoId_nivelFormativo: { formandoId, nivelFormativo: nivel },
          },
          select: {
            formacoesComunitariasRealizadas: true,
            retirosComunitariosRealizados: true,
            retirosPessoaisRealizados: true,
          },
        }),
      ]);

    const percentual = total > 0 ? Math.round((presentes / total) * 100) : 0;
    const requisitos = REQUISITOS_ETAPAS[nivel] ?? null;

    return NextResponse.json({
      formando: {
        id: formando.id,
        nome: formando.nome,
        nivelFormativo: formando.nivelFormativo,
        grupoFormacao: formando.grupoFormacao
          ? { id: formando.grupoFormacao.id, nome: formando.grupoFormacao.nome }
          : null,
      },
      presenca: {
        percentual,
        total,
        presentes,
        historico: historico.map((p) => ({
          id: p.id,
          agendamentoId: p.agendamentoId,
          data: p.data.toISOString(),
          tema: p.formacaoTema,
          tipoFormacao: p.agendamento?.tipoFormacao ?? null,
          presente: p.presente,
          justificativa: p.justificativa,
          confirmacaoFormando: p.confirmacaoFormando,
          justificativaFormando: p.justificativaFormando,
        })),
      },
      proximosEncontros: proximosEncontros.map((a) => ({
        id: a.id,
        tema: a.formacaoTema,
        tipoFormacao: a.tipoFormacao,
        dataInicio: a.dataInicio.toISOString(),
        dataFim: a.dataFim.toISOString(),
        local: a.local,
      })),
      progresso: requisitos
        ? {
            formacoesComunitariasRealizadas:
              progressoEtapa?.formacoesComunitariasRealizadas ?? 0,
            retirosComunitariosRealizados:
              progressoEtapa?.retirosComunitariosRealizados ?? 0,
            retirosPessoaisRealizados:
              progressoEtapa?.retirosPessoaisRealizados ?? 0,
            requisitos: {
              formacoesComunitarias: requisitos.formacoesComunitarias,
              retirosComunitarios: requisitos.retirosComunitarios,
              retirosPessoais: requisitos.retirosPessoais,
            },
          }
        : null,
    });
  } catch (err) {
    logError("portal/me GET", err);
    return NextResponse.json({ error: "Falha ao carregar dados" }, { status: 500 });
  }
}
