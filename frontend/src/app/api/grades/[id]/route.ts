import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId, UpdateGradeSchema, parseJson } from "@/lib/schemas";

import { isGestao, SessionUser as SU } from "@/lib/auth-helpers";
import { criarNotificacoes, formadoresDaGrade } from "@/lib/notificacoes";
import { syncGradeEixos, reconcileGradeFormacoes } from "@/lib/grade-formacoes";
type Params = { params: Promise<{ id: string }> };

import { toGrade } from "@/lib/converters";

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const row = await prisma.gradeFormativa.findFirst({
      where: { id, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      include: { eixos: { include: { etapas: true } } },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json(toGrade(row));
  } catch (err) { logError("grades/[id]", err); return NextResponse.json({ error: "Falha ao carregar grade" }, { status: 500 }); }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isGestao(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.gradeFormativa.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const parsedBody = await parseJson(request, UpdateGradeSchema);
    if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    const body = parsedBody.data;

    // O plano é a fonte dos eixos — o efetivo é o enviado (se trocou) ou o atual.
    const planoId = body.planoId ?? existing.planoId;
    const plano = await prisma.planoFormativo.findFirst({
      where: { id: planoId, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      select: { id: true },
    });
    if (!plano) return NextResponse.json({ error: "Plano formativo inválido" }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.gradeFormativa.update({
        where: { id },
        data: { nome: body.nome ?? existing.nome, planoId: plano.id, planoNome: body.planoNome, nivelFormativo: body.nivelFormativo, vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : undefined, vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : undefined, versao: body.versao, totalFormacoes: body.totalFormacoes, objetivos: body.objetivos || null, fundamentacao: body.fundamentacao || null, documentoAnexo: body.documentoAnexo || null, documentoAnexoId: body.documentoAnexoId || null, ativo: body.ativo },
      });

      // Eixos são projeção estável do plano — sincronizados por eixoPlanoId
      // (upsert), preservando ids. O cliente nunca cria/edita eixos.
      const eixoByPlano = await syncGradeEixos(tx, { gradeId: id, planoId: plano.id });

      // Reconcilia as formações PELO id na mesma transação — só o que o usuário
      // removeu na tela é soft-deletado; renomear eixo não faz nada sumir.
      if (body.formacoes !== undefined) {
        await reconcileGradeFormacoes(tx, {
          gradeId: id,
          planoId: plano.id,
          organizacaoId: user.organizacaoId!,
          nivelFormativo: body.nivelFormativo ?? existing.nivelFormativo,
          formacoes: body.formacoes,
          eixoByPlano,
        });
      }

      return tx.gradeFormativa.findUniqueOrThrow({ where: { id }, include: { eixos: { include: { etapas: true } } } });
    }, { timeout: 20000 });

    logAction("grade_updated", user.id, getClientIp(request), { id }, user.organizacaoId);

    // Notifica todos os FCs cujos grupos usam esta grade
    formadoresDaGrade(id).then((fcs) => {
      if (fcs.length === 0) return;
      criarNotificacoes(fcs.map(({ formadorId, organizacaoId }) => ({
        organizacaoId,
        destinatarioId: formadorId,
        tipo: "grade_atualizada" as const,
        titulo: "Grade formativa do seu grupo foi atualizada",
        corpo: `A grade "${updated.nome}" foi atualizada. Confira as alterações.`,
        linkAcao: `/grades/${id}`,
      })));
    }).catch(() => {});

    return NextResponse.json(toGrade(updated));
  } catch (err) { logError("grades/[id]", err); return NextResponse.json({ error: "Falha ao atualizar grade" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isGestao(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rlDel = await limiters.mutation(user.id ?? "unknown");
  if (!rlDel.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });
  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });
  try {
    const existing = await prisma.gradeFormativa.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.gradeFormativa.delete({ where: { id } });
    logAction("grade_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { logError("grades/[id]", err); return NextResponse.json({ error: "Falha ao excluir grade" }, { status: 500 }); }
}
