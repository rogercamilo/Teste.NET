import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { Formando, ProgressoEtapa } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string; moradaId?: string | null };
type Params = { params: Promise<{ id: string }> };

type PrismaFormando = {
  id: string; organizacaoId: string; nome: string; dataNascimento: Date;
  estadoCivil: string; modalidade: string; nivelFormativo: string; dataIngresso: Date;
  telefone: string; email: string; ativo: boolean; motivoInatividade: string | null;
  foto: string | null; turmaId: string | null; moradaId: string | null;
  totalFormacoes: number; formacoesRealizadas: number;
  progressoEtapas: { id: string; formandoId: string; nivelFormativo: string; formacoesComunitariasRealizadas: number; retirosComunitariosRealizados: number; retirosPessoaisRealizados: number; iniciouEm: Date | null; concluiuEm: Date | null }[];
};

function toFormando(f: PrismaFormando): Formando {
  return {
    id: f.id, nome: f.nome,
    dataNascimento: f.dataNascimento.toISOString().split("T")[0],
    estadoCivil: f.estadoCivil as Formando["estadoCivil"],
    modalidade: f.modalidade as Formando["modalidade"],
    nivelFormativo: f.nivelFormativo as Formando["nivelFormativo"],
    dataIngresso: f.dataIngresso.toISOString().split("T")[0],
    telefone: f.telefone, email: f.email, ativo: f.ativo,
    motivoInatividade: f.motivoInatividade as Formando["motivoInatividade"] ?? undefined,
    foto: f.foto ?? undefined, turmaId: f.turmaId ?? undefined, moradaId: f.moradaId ?? undefined,
    totalFormacoes: f.totalFormacoes, formacoesRealizadas: f.formacoesRealizadas,
    progressoEtapas: f.progressoEtapas.map((p): ProgressoEtapa => ({
      nivel: p.nivelFormativo as ProgressoEtapa["nivel"],
      formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas,
      retirosComunitariosRealizados: p.retirosComunitariosRealizados,
      retirosPessoaisRealizados: p.retirosPessoaisRealizados,
      iniciouEm: p.iniciouEm?.toISOString().split("T")[0],
      concluiuEm: p.concluiuEm?.toISOString().split("T")[0],
    })),
  };
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const { id } = await params;
    const where: Record<string, unknown> = { id, organizacaoId: user.organizacaoId };
    if (user.role === "formador_comunitario") where.moradaId = user.moradaId ?? null;

    const row = await prisma.formando.findFirst({
      where,
      include: { progressoEtapas: true, morada: { select: { gradeId: true } } },
    });
    if (!row) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const { morada, ...rest } = row;
    let totalFormacoes = rest.totalFormacoes;

    if (morada?.gradeId) {
      const grade = await prisma.gradeFormativa.findUnique({
        where: { id: morada.gradeId },
        select: { totalFormacoes: true },
      });
      if (grade && grade.totalFormacoes > 0) totalFormacoes = grade.totalFormacoes;
    } else {
      const count = await prisma.formacao.count({
        where: { nivelFormativo: rest.nivelFormativo, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
      });
      if (count > 0) totalFormacoes = count;
    }

    return NextResponse.json(toFormando({ ...rest, totalFormacoes }));
  } catch (err) {
    console.error("[formandos/:id GET]", err);
    return NextResponse.json({ error: "Falha ao carregar formando" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.formando.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    const body = await request.json() as Partial<Formando>;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.formando.update({
        where: { id },
        data: {
          nome: body.nome?.trim(),
          dataNascimento: body.dataNascimento ? new Date(body.dataNascimento) : undefined,
          estadoCivil: body.estadoCivil,
          modalidade: body.modalidade,
          nivelFormativo: body.nivelFormativo,
          dataIngresso: body.dataIngresso ? new Date(body.dataIngresso) : undefined,
          telefone: body.telefone,
          email: body.email,
          ativo: body.ativo,
          motivoInatividade: body.motivoInatividade || null,
          foto: body.foto || null,
          turmaId: body.turmaId || null,
          moradaId: body.moradaId || null,
          totalFormacoes: body.totalFormacoes,
          formacoesRealizadas: body.formacoesRealizadas,
        },
      });

      if (body.progressoEtapas) {
        for (const p of body.progressoEtapas) {
          await tx.progressoEtapa.upsert({
            where: { formandoId_nivelFormativo: { formandoId: id, nivelFormativo: p.nivel } },
            create: {
              formandoId: id, nivelFormativo: p.nivel,
              formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas ?? 0,
              retirosComunitariosRealizados: p.retirosComunitariosRealizados ?? 0,
              retirosPessoaisRealizados: p.retirosPessoaisRealizados ?? 0,
              iniciouEm: p.iniciouEm ? new Date(p.iniciouEm) : null,
              concluiuEm: p.concluiuEm ? new Date(p.concluiuEm) : null,
            },
            update: {
              formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas ?? 0,
              retirosComunitariosRealizados: p.retirosComunitariosRealizados ?? 0,
              retirosPessoaisRealizados: p.retirosPessoaisRealizados ?? 0,
              iniciouEm: p.iniciouEm ? new Date(p.iniciouEm) : null,
              concluiuEm: p.concluiuEm ? new Date(p.concluiuEm) : null,
            },
          });
        }
      }

      return tx.formando.findUniqueOrThrow({ where: { id }, include: { progressoEtapas: true } });
    });

    logAction("formando_updated", user.id, getClientIp(request), { id }, user.organizacaoId);
    return NextResponse.json(toFormando(updated));
  } catch (err) { console.error("[api]", err); return NextResponse.json({ error: "Falha ao atualizar formando" }, { status: 500 }); }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  try {
    const existing = await prisma.formando.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.formando.delete({ where: { id } });
    logAction("formando_deleted", user.id, getClientIp(request), { id }, user.organizacaoId);
    return new NextResponse(null, { status: 204 });
  } catch (err) { console.error("[api]", err); return NextResponse.json({ error: "Falha ao excluir formando" }, { status: 500 }); }
}
