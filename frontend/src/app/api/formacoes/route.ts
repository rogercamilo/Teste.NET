import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { CreateFormacaoSchema, parseJson } from "@/lib/schemas";
import type { Formacao } from "@/types";

import { podeElaborarConteudo, SessionUser as SU } from "@/lib/auth-helpers";

import { toFormacao } from "@/lib/converters";

export async function GET(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const where = { deletedAt: null, OR: [{ organizacaoId: user.organizacaoId }, { isGlobal: true }] };
    const orderBy = { criadoEm: "desc" as const };
    // Resolve nomes de Plano/Grade/Eixo por join (FK = fonte de verdade) e conta
    // realizações via Agendamento (G6).
    const include = {
      plano: { select: { nome: true } },
      grade: { select: { nome: true } },
      eixo: { select: { nome: true } },
      _count: { select: { agendamentos: { where: { deletedAt: null } } } },
    } as const;

    if (!pagination) {
      const rows = await prisma.formacao.findMany({ where, orderBy, include });
      return NextResponse.json(rows.map(toFormacao));
    }

    const [rows, total] = await Promise.all([
      prisma.formacao.findMany({ where, orderBy, include, skip: pagination.skip, take: pagination.take }),
      prisma.formacao.count({ where }),
    ]);
    return NextResponse.json(rows.map(toFormacao), { headers: paginationHeaders(total, pagination) });
  } catch (err) {
    logError("formacoes", err);
    return NextResponse.json({ error: "Falha ao carregar formações" }, { status: 500 });
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
    const parsed = await parseJson(request, CreateFormacaoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const origem = body.origem ?? "prevista";
    const row = await prisma.formacao.create({
      data: {
        organizacaoId: user.organizacaoId,
        tema: body.tema.trim(),
        objetivo: body.objetivo ?? "",
        descricao: body.descricao ?? "",
        nivelFormativo: body.nivelFormativo ?? "pre-discipulado",
        tipoFormacao: body.tipoFormacao ?? "comunitaria",
        planoId: body.planoId || null,
        gradeId: body.gradeId || null,
        eixoId: body.eixoId || null,
        numero: body.numero ?? null,
        // Governança do acréscimo (G4): carimba autor/momento quando complementar.
        origem,
        origemPor: origem === "complementar" ? (user.id ?? null) : null,
        origemEm: origem === "complementar" ? new Date() : null,
        codigo: body.codigo || null,
        responsavelInstitucional: body.responsavelInstitucional || null,
        dataRealizacao: body.dataRealizacao ? new Date(body.dataRealizacao) : null,
        contextoRealizacao: body.contextoRealizacao || null,
        statusRealizacao: body.statusRealizacao ?? "registrada",
        cargaHoraria: body.cargaHoraria ?? 1,
        modalidade: body.modalidade ?? "presencial",
        materialApoio: body.materialApoio || null,
        documentoAnexo: body.documentoAnexo || null,
        documentoAnexoId: body.documentoAnexoId || null,
        materialFormadorAnexo: body.materialFormadorAnexo || null,
        materialFormadorAnexoId: body.materialFormadorAnexoId || null,
        observacoesFormador: body.observacoesFormador || null,
      },
      include: {
        plano: { select: { nome: true } },
        grade: { select: { nome: true } },
        eixo: { select: { nome: true } },
        _count: { select: { agendamentos: { where: { deletedAt: null } } } },
      },
    });
    logAction("formacao_created", user.id, getClientIp(request), { tema: body.tema }, user.organizacaoId);
    return NextResponse.json(toFormacao(row), { status: 201 });
  } catch (err) {
    logError("formacoes", err);
    return NextResponse.json({ error: "Falha ao criar formação" }, { status: 500 });
  }
}
