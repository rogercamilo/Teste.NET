import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";

import { podeElaborarConteudo, SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!podeElaborarConteudo(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });

  const original = await prisma.formacao.findFirst({
    where: { id, deletedAt: null, OR: [{ isGlobal: true }, { organizacaoId: user.organizacaoId }] },
  });

  if (!original) return NextResponse.json({ error: "Formação não encontrada" }, { status: 404 });

  const clone = await prisma.formacao.create({
    data: {
      organizacaoId: user.organizacaoId!,
      isGlobal: false,
      tema: `${original.tema} (cópia)`,
      objetivo: original.objetivo,
      descricao: original.descricao,
      nivelFormativo: original.nivelFormativo,
      tipoFormacao: original.tipoFormacao,
      planoId: original.planoId,
      gradeId: original.gradeId,
      eixoId: original.eixoId,
      numero: original.numero,
      origem: original.origem,
      origemPor: original.origemPor,
      origemEm: original.origemEm,
      codigo: original.codigo,
      responsavelInstitucional: original.responsavelInstitucional,
      dataRealizacao: original.dataRealizacao,
      contextoRealizacao: original.contextoRealizacao,
      statusRealizacao: original.statusRealizacao,
      cargaHoraria: original.cargaHoraria,
      modalidade: original.modalidade,
      materialApoio: original.materialApoio,
      observacoesFormador: original.observacoesFormador,
    },
  });

  logAction("formacao_created", user.id, getClientIp(request), { clonedFrom: id, cloneId: clone.id }, user.organizacaoId);
  return NextResponse.json({ id: clone.id, tema: clone.tema }, { status: 201 });
}
