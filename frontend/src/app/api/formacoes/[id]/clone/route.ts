import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };

function isAdmin(role?: string) { return role === "administrador" || role === "formador_geral"; }

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { id } = await params;

  const original = await prisma.formacao.findFirst({ where: { id } });

  if (!original) return NextResponse.json({ error: "Formação não encontrada" }, { status: 404 });

  const isGlobalOrSameTenant =
    original.isGlobal ||
    original.organizacaoId === null ||
    original.organizacaoId === user.organizacaoId;

  if (!isGlobalOrSameTenant) {
    return NextResponse.json({ error: "Sem permissão para clonar esta formação" }, { status: 403 });
  }

  const clone = await prisma.formacao.create({
    data: {
      organizacaoId: user.organizacaoId!,
      isGlobal: false,
      tema: `${original.tema} (cópia)`,
      objetivo: original.objetivo,
      descricao: original.descricao,
      nivelFormativo: original.nivelFormativo,
      tipoFormacao: original.tipoFormacao,
      eixoId: original.eixoId,
      eixoNome: original.eixoNome,
      etapaId: original.etapaId,
      etapaNome: original.etapaNome,
      formadorNome: original.formadorNome,
      cargaHoraria: original.cargaHoraria,
      modalidade: original.modalidade,
      materialApoio: original.materialApoio,
      gradeId: original.gradeId,
      gradeNome: original.gradeNome,
      vezesUtilizada: 0,
    },
  });

  logAction("formacao_created", user.id, getClientIp(request), { clonedFrom: id, cloneId: clone.id }, user.organizacaoId);
  return NextResponse.json({ id: clone.id, tema: clone.tema }, { status: 201 });
}
