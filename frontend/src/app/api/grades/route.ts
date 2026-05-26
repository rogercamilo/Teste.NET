import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import type { GradeFormativa, Eixo, Etapa } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

function isAdmin(role?: string) {
  return role === "administrador" || role === "formador_geral";
}

type PrismaGrade = {
  id: string; organizacaoId: string | null; nome: string; planoId: string;
  planoNome: string; nivelFormativo: string; vigenciaInicio: Date; vigenciaFim: Date;
  versao: string; totalFormacoes: number; objetivos: string | null;
  fundamentacao: string | null; documentoAnexo: string | null;
  documentoAnexoId: string | null; ativo: boolean; criadoEm: Date;
  eixos: {
    id: string; gradeId: string; nome: string; descricao: string;
    ordem: number; cor: string | null;
    etapas: { id: string; eixoId: string; nome: string; descricao: string; ordem: number; cargaHoraria: number }[];
  }[];
};

function toGrade(g: PrismaGrade): GradeFormativa {
  return {
    id: g.id,
    nome: g.nome,
    planoId: g.planoId,
    planoNome: g.planoNome,
    nivelFormativo: g.nivelFormativo as GradeFormativa["nivelFormativo"],
    vigenciaInicio: g.vigenciaInicio.toISOString().split("T")[0],
    vigenciaFim: g.vigenciaFim.toISOString().split("T")[0],
    versao: g.versao,
    eixos: g.eixos.map((e): Eixo => ({
      id: e.id,
      nome: e.nome,
      descricao: e.descricao,
      gradeId: e.gradeId,
      ordem: e.ordem,
      cor: e.cor ?? undefined,
    })),
    etapas: g.eixos.flatMap((e) =>
      e.etapas.map((t): Etapa => ({
        id: t.id,
        nome: t.nome,
        descricao: t.descricao,
        eixoId: t.eixoId,
        ordem: t.ordem,
        cargaHoraria: t.cargaHoraria,
      }))
    ),
    totalFormacoes: g.totalFormacoes,
    objetivos: g.objetivos ?? undefined,
    fundamentacao: g.fundamentacao ?? undefined,
    documentoAnexo: g.documentoAnexo ?? undefined,
    documentoAnexoId: g.documentoAnexoId ?? undefined,
    ativo: g.ativo,
    criadoEm: g.criadoEm.toISOString(),
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
    const include = { eixos: { include: { etapas: true } } };

    if (!pagination) {
      const rows = await prisma.gradeFormativa.findMany({ where, include, orderBy });
      return NextResponse.json(rows.map(toGrade));
    }

    const [rows, total] = await Promise.all([
      prisma.gradeFormativa.findMany({ where, include, orderBy, skip: pagination.skip, take: pagination.take }),
      prisma.gradeFormativa.count({ where }),
    ]);
    return NextResponse.json(rows.map(toGrade), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("grades", err);
    return NextResponse.json({ error: "Falha ao carregar grades" }, { status: 500 });
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
    const body = await request.json() as Partial<GradeFormativa>;
    if (!body.planoId) return NextResponse.json({ error: "planoId é obrigatório" }, { status: 400 });

    const grade = await prisma.$transaction(async (tx) => {
      const created = await tx.gradeFormativa.create({
        data: {
          organizacaoId: user.organizacaoId,
          nome: body.nome ?? "",
          planoId: body.planoId!,
          planoNome: body.planoNome ?? "",
          nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
          vigenciaInicio: new Date(body.vigenciaInicio ?? Date.now()),
          vigenciaFim: new Date(body.vigenciaFim ?? Date.now()),
          versao: body.versao ?? "1.0",
          totalFormacoes: body.totalFormacoes ?? 0,
          objetivos: body.objetivos || null,
          fundamentacao: body.fundamentacao || null,
          documentoAnexo: body.documentoAnexo || null,
          documentoAnexoId: body.documentoAnexoId || null,
          ativo: body.ativo ?? true,
        },
      });

      // Criar eixos em paralelo, mapeando IDs do cliente para IDs do servidor
      const eixoEntries = await Promise.all(
        (body.eixos ?? []).map((eixo) =>
          tx.eixo
            .create({ data: { gradeId: created.id, nome: eixo.nome, descricao: eixo.descricao, ordem: eixo.ordem, cor: eixo.cor || null }, select: { id: true } })
            .then((e) => [eixo.id, e.id] as [string, string])
        )
      );
      const eixoIdMap = new Map(eixoEntries);

      // Criar etapas em paralelo
      await Promise.all(
        (body.etapas ?? []).map((etapa) => {
          const newEixoId = eixoIdMap.get(etapa.eixoId);
          if (!newEixoId) return Promise.resolve(null);
          return tx.etapa.create({ data: { eixoId: newEixoId, nome: etapa.nome, descricao: etapa.descricao, ordem: etapa.ordem, cargaHoraria: etapa.cargaHoraria } });
        })
      );

      return tx.gradeFormativa.findUniqueOrThrow({
        where: { id: created.id },
        include: { eixos: { include: { etapas: true } } },
      });
    });

    logAction("grade_created", user.id, getClientIp(request), { planoId: body.planoId }, user.organizacaoId);
    return NextResponse.json(toGrade(grade), { status: 201 });
  } catch (err) {
    logError("grades", err);
    return NextResponse.json({ error: "Falha ao criar grade" }, { status: 500 });
  }
}
