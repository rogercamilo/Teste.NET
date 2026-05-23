import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import { canAddMorada } from "@/lib/plan-limits";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
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

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const where = { organizacaoId: user.organizacaoId };
    const orderBy = { nome: "asc" as const };

    if (!pagination) {
      const rows = await prisma.morada.findMany({ where, orderBy });
      return NextResponse.json(rows.map(toMorada));
    }

    const [rows, total] = await Promise.all([
      prisma.morada.findMany({ where, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.morada.count({ where }),
    ]);
    return NextResponse.json(rows.map(toMorada), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    console.error("[moradas GET]", err);
    return NextResponse.json({ error: "Falha ao carregar moradas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json() as Partial<Morada>;
    if (!body.nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const limitCheck = await canAddMorada(user.organizacaoId!);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 403 });
    }

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
  } catch (err) {
    console.error("[api]", err);
    return NextResponse.json({ error: "Falha ao criar morada" }, { status: 500 });
  }
}
