import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { parsePagination, paginationHeaders } from "@/lib/pagination";

import { podeElaborarConteudo, SessionUser as SU } from "@/lib/auth-helpers";

import { toPlano } from "@/lib/converters";
import { CreatePlanoSchema, parseJson } from "@/lib/schemas";

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
      const rows = await prisma.planoFormativo.findMany({ where, include: { eixos: true, retiros: true }, orderBy });
      return NextResponse.json(rows.map(toPlano));
    }

    const [rows, total] = await Promise.all([
      prisma.planoFormativo.findMany({ where, include: { eixos: true, retiros: true }, orderBy, skip: pagination.skip, take: pagination.take }),
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
  if (!podeElaborarConteudo(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  try {
    const parsedBody = await parseJson(request, CreatePlanoSchema);
    if (!parsedBody.ok) return NextResponse.json({ error: parsedBody.error }, { status: 400 });
    const body = parsedBody.data;

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
            nomeEtapa: e.nomeEtapa || null,
            objetivo: e.objetivo,
            intervaloEncontros: e.intervaloEncontros,
            cargaHoraria: e.cargaHoraria,
            areaFormacao: e.areaFormacao,
            ordem: e.ordem,
          })),
        },
        retiros: {
          create: (body.retiros ?? []).map((r) => ({
            tipo: r.tipo,
            numero: r.numero,
            tema: r.tema,
            trechoBiblico: r.trechoBiblico || null,
            objetivo: r.objetivo,
            quandoRealizar: r.quandoRealizar,
            cargaHoraria: r.cargaHoraria,
            materialAnexo: r.materialAnexo || null,
            materialAnexoId: r.materialAnexoId || null,
          })),
        },
      },
      include: { eixos: true, retiros: true },
    });
    logAction("plano_created", user.id, getClientIp(request), { nome: body.nome }, user.organizacaoId);
    return NextResponse.json(toPlano(row), { status: 201 });
  } catch (err) {
    logError("planos", err);
    return NextResponse.json({ error: "Falha ao criar plano" }, { status: 500 });
  }
}
