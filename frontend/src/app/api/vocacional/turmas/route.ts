import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { CreateTurmaVocacionalSchema, parseJson } from "@/lib/schemas";
import { isGestao } from "@/lib/auth-helpers";
import { requireVocacionalAccess } from "../guard";

export async function GET() {
  const guard = await requireVocacionalAccess({ minPapel: "formador_comunitario" });
  if ("error" in guard) return guard.error;
  const { organizacaoId } = guard.access;

  try {
    const turmas = await prisma.grupoFormacao.findMany({
      where: { organizacaoId, tipo: "vocacional" },
      orderBy: { criadoEm: "desc" },
      omit: { imagemUrl: true },
      include: {
        formador: { select: { id: true, nome: true } },
        _count: { select: { participacoesVocacional: true } },
      },
    });
    return NextResponse.json(turmas);
  } catch (err) {
    logError("vocacional turmas GET", err);
    return NextResponse.json({ error: "Falha ao carregar turmas vocacionais" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await requireVocacionalAccess({ minPapel: "formador_geral" });
  if ("error" in guard) return guard.error;
  const { user, organizacaoId } = guard.access;
  if (!isGestao(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const parsed = await parseJson(request, CreateTurmaVocacionalSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    if (body.formadorId) {
      const formador = await prisma.usuario.findFirst({
        where: { id: body.formadorId, organizacaoId, deletedAt: null },
      });
      if (!formador) return NextResponse.json({ error: "Formador não encontrado" }, { status: 404 });
    }

    const turma = await prisma.grupoFormacao.create({
      data: {
        organizacaoId,
        nome: body.nome,
        localReuniao: body.localReuniao ?? null,
        tipo: "vocacional",
        nivelFormativo: null,
        formadorId: body.formadorId ?? null,
        planoId: body.planoId ?? null,
        gradeId: body.gradeId ?? null,
        vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : new Date(),
        vocacionalDuracaoMeses: body.vocacionalDuracaoMeses ?? null,
        vocacionalTotalRetiros: body.vocacionalTotalRetiros ?? null,
        vocacionalAcompanhamentoAtivo: body.vocacionalAcompanhamentoAtivo ?? false,
      },
      omit: { imagemUrl: true },
    });

    logAction("vocacional_turma_criada", user.id, getClientIp(request), { turmaId: turma.id, nome: turma.nome }, organizacaoId);
    return NextResponse.json(turma, { status: 201 });
  } catch (err) {
    logError("vocacional turmas POST", err);
    return NextResponse.json({ error: "Falha ao criar turma vocacional" }, { status: 500 });
  }
}
