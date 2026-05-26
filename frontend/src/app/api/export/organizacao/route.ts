import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

type SessionUser = { id?: string; role?: string; organizacaoId?: string };

function isAdminOrAbove(role: string | undefined) {
  return role === "administrador" || role === "formador_geral" || role === "super_admin";
}

export async function GET(request: Request) {
  const session = await auth();
  const actor = session?.user as SessionUser | undefined;
  if (!actor?.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdminOrAbove(actor.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const orgId = actor.organizacaoId;
  if (!orgId) return NextResponse.json({ error: "Organização não encontrada" }, { status: 400 });

  const rl = await limiters.export(actor.id!);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Limite de exportações atingido. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  const [organizacao, usuarios, moradas, formandos, formacoes, agendamentos, presencas, comentarios, eventos] =
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
      prisma.morada.findMany({
        where: { organizacaoId: orgId },
        select: { id: true, nome: true, nivelFormativo: true, ativo: true, criadoEm: true },
        orderBy: { criadoEm: "asc" },
        take: 1000,
      }),
      prisma.formando.findMany({
        where: { organizacaoId: orgId, deletedAt: null },
        select: {
          id: true, nome: true, email: true, telefone: true, dataNascimento: true,
          nivelFormativo: true, ativo: true, moradaId: true, criadoEm: true,
        },
        orderBy: { criadoEm: "asc" },
        take: 10000,
      }),
      prisma.formacao.findMany({
        where: { organizacaoId: orgId },
        select: { id: true, tema: true, tipoFormacao: true, eixoNome: true, etapaNome: true, criadoEm: true },
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
    moradas,
    formandos,
    formacoes,
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
}
