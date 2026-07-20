import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

import { SessionUser } from "@/lib/auth-helpers";
import { isGestao } from "@/types";

export async function GET(request: Request) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;
  if (!actor?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  // Gestão de dados da organização = Administrador + Formador Geral. O super_admin
  // (operador da plataforma) não acessa dados de tenant por aqui — só pelo cockpit.
  if (!isGestao(actor.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const orgId = actor.organizacaoId;
  if (!orgId) return NextResponse.json({ error: "Organização não encontrada" }, { status: 400 });

  const rl = await limiters.export(actor.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Limite de exportações atingido. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const [organizacao, usuarios, grupos, formandos, formacoes, agendamentos, presencas, comentarios, eventos] =
      await Promise.all([
        prisma.organizacao.findUnique({
          where: { id: orgId },
          select: { id: true, nome: true, descricao: true, status: true, planoAssinatura: true, criadoEm: true },
        }),
        prisma.usuario.findMany({
          where: { organizacaoId: orgId, deletedAt: null },
          select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true },
          orderBy: { criadoEm: "asc" },
          take: 5000,
        }),
        prisma.grupoFormacao.findMany({
          where: { organizacaoId: orgId },
          select: { id: true, nome: true, nivelFormativo: true, ativo: true, criadoEm: true },
          orderBy: { criadoEm: "asc" },
          take: 1000,
        }),
        prisma.formando.findMany({
          where: { organizacaoId: orgId, deletedAt: null },
          select: {
            id: true, nome: true, email: true, telefone: true, dataNascimento: true,
            nivelFormativo: true, ativo: true, grupoFormacaoId: true, criadoEm: true,
          },
          orderBy: { criadoEm: "asc" },
          take: 10000,
        }),
        prisma.formacao.findMany({
          where: { organizacaoId: orgId },
          select: {
            id: true, tema: true, tipoFormacao: true, numero: true, origem: true, criadoEm: true,
            plano: { select: { nome: true } },
            grade: { select: { nome: true } },
            eixo: { select: { nome: true } },
          },
          orderBy: { criadoEm: "asc" },
          take: 5000,
        }),
        prisma.agendamento.findMany({
          where: { organizacaoId: orgId },
          select: { id: true, dataInicio: true, dataFim: true, local: true, formacaoId: true, status: true, criadoEm: true },
          orderBy: { dataInicio: "asc" },
          take: 10000,
        }),
        prisma.presencaFormacao.findMany({
          where: { organizacaoId: orgId },
          select: { formandoId: true, agendamentoId: true, presente: true, justificativa: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
          take: 5000,
        }),
        prisma.comentarioFormando.findMany({
          where: { organizacaoId: orgId },
          select: { formandoId: true, tipo: true, texto: true, formadorId: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
          take: 2000,
        }),
        prisma.eventoFormando.findMany({
          where: { organizacaoId: orgId },
          select: { formandoId: true, tipo: true, motivo: true, criadoEm: true },
          orderBy: { criadoEm: "desc" },
          take: 2000,
        }),
      ]);

    const payload = {
      exportadoEm: new Date().toISOString(),
      versaoExportacao: "1.0",
      organizacao,
      usuarios,
      grupos,
      formandos,
      formacoes: formacoes.map(({ plano, grade, eixo, ...f }) => ({
        ...f,
        planoNome: plano?.nome ?? null,
        gradeNome: grade?.nome ?? null,
        eixoNome: eixo?.nome ?? null,
      })),
      agendamentos,
      presencas,
      comentarios,
      eventos,
    };

    logAction("organizacao_exportada", actor.id, getClientIp(request), { tipo: "dados-organizacao" }, actor.organizacaoId);

    const filename = `dados-organizacao-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (err) {
    logError("export/organizacao GET", err);
    return NextResponse.json({ error: "Falha ao exportar dados da organização" }, { status: 500 });
  }
}
