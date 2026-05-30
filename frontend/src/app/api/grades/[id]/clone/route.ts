import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";

import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });

  const original = await prisma.gradeFormativa.findFirst({
    where: { id, OR: [{ isGlobal: true }, { organizacaoId: user.organizacaoId }] },
    include: { eixos: { include: { etapas: true } } },
  });

  if (!original) return NextResponse.json({ error: "Grade não encontrada" }, { status: 404 });

  // Validate the referenced plano is accessible (global or tenant's own)
  const planoAcessivel = await prisma.planoFormativo.findFirst({
    where: { id: original.planoId, OR: [{ isGlobal: true }, { organizacaoId: user.organizacaoId }] },
    select: { id: true },
  });
  if (!planoAcessivel) {
    return NextResponse.json({ error: "Plano da grade não está acessível para esta organização" }, { status: 422 });
  }

  const clone = await prisma.$transaction(async (tx) => {
    const newGrade = await tx.gradeFormativa.create({
      data: {
        organizacaoId: user.organizacaoId!,
        isGlobal: false,
        nome: `${original.nome} (cópia)`,
        planoId: original.planoId,
        planoNome: original.planoNome,
        nivelFormativo: original.nivelFormativo,
        vigenciaInicio: original.vigenciaInicio,
        vigenciaFim: original.vigenciaFim,
        versao: original.versao,
        totalFormacoes: original.totalFormacoes,
        objetivos: original.objetivos,
        fundamentacao: original.fundamentacao,
        ativo: true,
      },
    });

    for (const eixo of original.eixos) {
      const newEixo = await tx.eixo.create({
        data: {
          gradeId: newGrade.id,
          nome: eixo.nome,
          descricao: eixo.descricao,
          ordem: eixo.ordem,
          cor: eixo.cor,
        },
      });
      for (const etapa of eixo.etapas) {
        await tx.etapa.create({
          data: {
            eixoId: newEixo.id,
            nome: etapa.nome,
            descricao: etapa.descricao,
            ordem: etapa.ordem,
            cargaHoraria: etapa.cargaHoraria,
          },
        });
      }
    }

    return newGrade;
  });

  logAction("grade_created", user.id, getClientIp(request), { clonedFrom: id, cloneId: clone.id }, user.organizacaoId);
  return NextResponse.json({ id: clone.id, nome: clone.nome }, { status: 201 });
}
