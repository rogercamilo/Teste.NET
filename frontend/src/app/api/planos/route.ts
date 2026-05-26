import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import type { PlanoFormativo, EixoPlano } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

function isAdmin(role?: string) {
  return role === "administrador" || role === "formador_geral";
}

type PrismaPlano = {
  id: string; organizacaoId: string | null; nome: string; objetivos: string;
  fundamentacao: string; nivelFormativo: string; vigenciaInicio: Date;
  vigenciaFim: Date; status: string; documentoAnexo: string | null;
  documentoAnexoId: string | null; criadoEm: Date; atualizadoEm: Date;
  eixos: { id: string; nome: string; objetivo: string; intervaloEncontros: string; cargaHoraria: number; areaFormacao: string }[];
};

function toPlano(p: PrismaPlano): PlanoFormativo {
  return {
    id: p.id,
    nome: p.nome,
    objetivos: p.objetivos,
    fundamentacao: p.fundamentacao,
    nivelFormativo: p.nivelFormativo as PlanoFormativo["nivelFormativo"],
    eixos: p.eixos.map((e): EixoPlano => ({
      id: e.id,
      nome: e.nome,
      objetivo: e.objetivo,
      intervaloEncontros: e.intervaloEncontros,
      cargaHoraria: e.cargaHoraria,
      areaFormacao: e.areaFormacao,
    })),
    vigenciaInicio: p.vigenciaInicio.toISOString().split("T")[0],
    vigenciaFim: p.vigenciaFim.toISOString().split("T")[0],
    status: p.status as PlanoFormativo["status"],
    documentoAnexo: p.documentoAnexo ?? undefined,
    documentoAnexoId: p.documentoAnexoId ?? undefined,
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const where = { OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] };
    const orderBy = { criadoEm: "desc" as const };

    if (!pagination) {
      const rows = await prisma.planoFormativo.findMany({ where, include: { eixos: true }, orderBy });
      return NextResponse.json(rows.map(toPlano));
    }

    const [rows, total] = await Promise.all([
      prisma.planoFormativo.findMany({ where, include: { eixos: true }, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.planoFormativo.count({ where }),
    ]);
    return NextResponse.json(rows.map(toPlano), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("planos", err);
    return NextResponse.json({ error: "Falha ao carregar planos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  try {
    const body = await request.json() as Partial<PlanoFormativo>;
    if (!body.nome?.trim()) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

    const row = await prisma.planoFormativo.create({
      data: {
        organizacaoId: user.organizacaoId,
        nome: body.nome.trim(),
        objetivos: body.objetivos ?? "",
        fundamentacao: body.fundamentacao ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        vigenciaInicio: new Date(body.vigenciaInicio ?? Date.now()),
        vigenciaFim: new Date(body.vigenciaFim ?? Date.now()),
        status: body.status ?? "rascunho",
        documentoAnexo: body.documentoAnexo || null,
        documentoAnexoId: body.documentoAnexoId || null,
        eixos: {
          create: (body.eixos ?? []).map((e) => ({
            nome: e.nome,
            objetivo: e.objetivo,
            intervaloEncontros: e.intervaloEncontros,
            cargaHoraria: e.cargaHoraria,
            areaFormacao: e.areaFormacao,
          })),
        },
      },
      include: { eixos: true },
    });
    logAction("plano_created", user.id, getClientIp(request), { nome: body.nome }, user.organizacaoId);
    return NextResponse.json(toPlano(row), { status: 201 });
  } catch (err) {
    logError("planos", err);
    return NextResponse.json({ error: "Falha ao criar plano" }, { status: 500 });
  }
}
