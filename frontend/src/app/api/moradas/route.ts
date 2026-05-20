import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { Morada } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };
type PrismaMorada = {
  id: string; organizacaoId: string; nome: string; endereco: string | null;
  nivelFormativo: string; formadorId: string | null; planoId: string | null;
  gradeId: string | null; vigenciaInicio: Date | null; vigenciaFim: Date | null;
  ativo: boolean; criadoEm: Date;
};

function isAdmin(role?: string) {
  return role === "administrador" || role === "formador_geral";
}

function toMorada(m: PrismaMorada): Morada {
  return {
    id: m.id,
    nome: m.nome,
    endereco: m.endereco ?? undefined,
    nivelFormativo: m.nivelFormativo as Morada["nivelFormativo"],
    formadorId: m.formadorId ?? undefined,
    planoId: m.planoId ?? undefined,
    gradeId: m.gradeId ?? undefined,
    vigenciaInicio: m.vigenciaInicio?.toISOString().split("T")[0],
    vigenciaFim: m.vigenciaFim?.toISOString().split("T")[0],
    ativo: m.ativo,
    criadoEm: m.criadoEm.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rows = await prisma.morada.findMany({
    where: { organizacaoId: user.organizacaoId },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(rows.map(toMorada));
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json() as Partial<Morada>;
    if (!body.nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    if (body.formadorId) {
      const formador = await prisma.usuario.findFirst({
        where: { id: body.formadorId, organizacaoId: user.organizacaoId },
      });
      if (!formador) return NextResponse.json({ error: "Formador não encontrado" }, { status: 400 });
    }

    const row = await prisma.morada.create({
      data: {
        organizacaoId: user.organizacaoId,
        nome: body.nome.trim(),
        endereco: body.endereco || null,
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        formadorId: body.formadorId || null,
        planoId: body.planoId || null,
        gradeId: body.gradeId || null,
        vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : null,
        vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : null,
        ativo: body.ativo ?? true,
      },
    });
    logAction("morada_created", user.id, getClientIp(request), { nome: body.nome }, user.organizacaoId);
    return NextResponse.json(toMorada(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar morada" }, { status: 500 });
  }
}
