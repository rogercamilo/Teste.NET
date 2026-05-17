import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import type { Formacao } from "@/types";

type SU = { id?: string; role?: string; organizacaoId?: string };

function isAdmin(role?: string) {
  return role === "administrador" || role === "formador_geral";
}

type PrismaFormacao = {
  id: string; organizacaoId: string | null; tema: string; objetivo: string;
  descricao: string; nivelFormativo: string; tipoFormacao: string;
  eixoId: string | null; eixoNome: string | null; etapaId: string | null;
  etapaNome: string | null; formadorId: string | null; formadorNome: string;
  cargaHoraria: number; modalidade: string; materialApoio: string | null;
  documentoAnexo: string | null; documentoAnexoId: string | null;
  gradeId: string | null; gradeNome: string | null; vezesUtilizada: number;
  criadoEm: Date;
};

function toFormacao(f: PrismaFormacao): Formacao {
  return {
    id: f.id,
    tema: f.tema,
    objetivo: f.objetivo,
    descricao: f.descricao,
    nivelFormativo: f.nivelFormativo as Formacao["nivelFormativo"],
    tipoFormacao: f.tipoFormacao as Formacao["tipoFormacao"],
    eixoId: f.eixoId ?? undefined,
    eixoNome: f.eixoNome ?? undefined,
    etapaId: f.etapaId ?? undefined,
    etapaNome: f.etapaNome ?? undefined,
    formadorId: f.formadorId ?? "",
    formadorNome: f.formadorNome,
    cargaHoraria: f.cargaHoraria,
    modalidade: f.modalidade as Formacao["modalidade"],
    materialApoio: f.materialApoio ?? undefined,
    documentoAnexo: f.documentoAnexo ?? undefined,
    documentoAnexoId: f.documentoAnexoId ?? undefined,
    gradeId: f.gradeId ?? undefined,
    gradeNome: f.gradeNome ?? undefined,
    vezesUtilizada: f.vezesUtilizada,
    criadoEm: f.criadoEm.toISOString(),
  };
}

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rows = await prisma.formacao.findMany({
    where: { OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] },
    orderBy: { criadoEm: "desc" },
  });
  return NextResponse.json(rows.map(toFormacao));
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  try {
    const body = await request.json() as Partial<Formacao>;
    if (!body.tema?.trim()) return NextResponse.json({ error: "Tema é obrigatório" }, { status: 400 });

    const row = await prisma.formacao.create({
      data: {
        organizacaoId: user.organizacaoId,
        tema: body.tema.trim(),
        objetivo: body.objetivo ?? "",
        descricao: body.descricao ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: body.tipoFormacao ?? "comunitaria",
        eixoId: body.eixoId || null,
        eixoNome: body.eixoNome || null,
        etapaId: body.etapaId || null,
        etapaNome: body.etapaNome || null,
        formadorId: user.id ?? null,
        formadorNome: body.formadorNome ?? "",
        cargaHoraria: body.cargaHoraria ?? 1,
        modalidade: body.modalidade ?? "presencial",
        materialApoio: body.materialApoio || null,
        documentoAnexo: body.documentoAnexo || null,
        documentoAnexoId: body.documentoAnexoId || null,
        gradeId: body.gradeId || null,
        gradeNome: body.gradeNome || null,
        vezesUtilizada: body.vezesUtilizada ?? 0,
      },
    });
    logAction("formacao_created", user.id, getClientIp(request), { tema: body.tema }, user.organizacaoId);
    return NextResponse.json(toFormacao(row), { status: 201 });
  } catch {
    return NextResponse.json({ error: "Falha ao criar formação" }, { status: 500 });
  }
}
