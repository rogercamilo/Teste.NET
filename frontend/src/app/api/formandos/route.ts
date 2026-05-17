import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { Formando, ProgressoEtapa } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

type PrismaFormando = {
  id: string; organizacaoId: string; nome: string; dataNascimento: Date;
  estadoCivil: string; modalidade: string; nivelFormativo: string;
  dataIngresso: Date; telefone: string; email: string; ativo: boolean;
  motivoInatividade: string | null; foto: string | null; turmaId: string | null;
  moradaId: string | null; totalFormacoes: number; formacoesRealizadas: number;
  progressoEtapas: {
    id: string; formandoId: string; nivelFormativo: string;
    formacoesComunitariasRealizadas: number; retirosComunitariosRealizados: number;
    retirosPessoaisRealizados: number; iniciouEm: Date | null; concluiuEm: Date | null;
  }[];
};

function toFormando(f: PrismaFormando): Formando {
  return {
    id: f.id,
    nome: f.nome,
    dataNascimento: f.dataNascimento.toISOString().split("T")[0],
    estadoCivil: f.estadoCivil as Formando["estadoCivil"],
    modalidade: f.modalidade as Formando["modalidade"],
    nivelFormativo: f.nivelFormativo as Formando["nivelFormativo"],
    dataIngresso: f.dataIngresso.toISOString().split("T")[0],
    telefone: f.telefone,
    email: f.email,
    ativo: f.ativo,
    motivoInatividade: f.motivoInatividade as Formando["motivoInatividade"] ?? undefined,
    foto: f.foto ?? undefined,
    turmaId: f.turmaId ?? undefined,
    moradaId: f.moradaId ?? undefined,
    totalFormacoes: f.totalFormacoes,
    formacoesRealizadas: f.formacoesRealizadas,
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

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const moradaId = searchParams.get("moradaId");
  const where: Record<string, unknown> = { organizacaoId: user.organizacaoId };
  if (moradaId) where.moradaId = moradaId;

  const rows = await prisma.formando.findMany({
    where,
    include: { progressoEtapas: true },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(rows.map(toFormando));
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const body = await request.json() as Partial<Formando>;
    if (!body.nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    if (!body.dataNascimento) return NextResponse.json({ error: "Data de nascimento é obrigatória" }, { status: 400 });

    const row = await prisma.formando.create({
      data: {
        organizacaoId: user.organizacaoId,
        nome: body.nome.trim(),
        dataNascimento: new Date(body.dataNascimento),
        estadoCivil: body.estadoCivil ?? "solteiro",
        modalidade: body.modalidade ?? "presencial",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        dataIngresso: new Date(body.dataIngresso ?? Date.now()),
        telefone: body.telefone ?? "",
        email: body.email ?? "",
        ativo: body.ativo ?? true,
        motivoInatividade: body.motivoInatividade || null,
        foto: body.foto || null,
        turmaId: body.turmaId || null,
        moradaId: body.moradaId || null,
        totalFormacoes: body.totalFormacoes ?? 0,
        formacoesRealizadas: body.formacoesRealizadas ?? 0,
        progressoEtapas: {
          create: (body.progressoEtapas ?? []).map((p) => ({
            nivelFormativo: p.nivel,
            formacoesComunitariasRealizadas: p.formacoesComunitariasRealizadas ?? 0,
            retirosComunitariosRealizados: p.retirosComunitariosRealizados ?? 0,
            retirosPessoaisRealizados: p.retirosPessoaisRealizados ?? 0,
            iniciouEm: p.iniciouEm ? new Date(p.iniciouEm) : null,
            concluiuEm: p.concluiuEm ? new Date(p.concluiuEm) : null,
          })),
        },
      },
      include: { progressoEtapas: true },
    });
    logAction("formando_created", user.id, getClientIp(request), { nome: body.nome }, user.organizacaoId);
    return NextResponse.json(toFormando(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar formando" }, { status: 500 });
  }
}
