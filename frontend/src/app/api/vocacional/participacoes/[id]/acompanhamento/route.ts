import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { encryptField, decryptField } from "@/lib/crypto";
import { limiters } from "@/lib/rate-limit";
import { CreateAcompanhamentoVocacionalSchema, parseBody } from "@/lib/schemas";
import { parseDataLocal } from "@/lib/livro-registro";
import { podeVerAcompanhamento } from "@/lib/vocacional-rules";
import { requireVocacionalAccess } from "../../../guard";

/**
 * Visibilidade das anotações (foro íntimo): apenas o acompanhador designado, o
 * formador responsável pela turma, e a gestão (formador_geral / administrador).
 * O vocacionado NUNCA acessa (não há rota de portal para isto).
 */
async function carregarContexto(id: string, organizacaoId: string) {
  return prisma.participacaoVocacional.findFirst({
    where: { id, organizacaoId },
    include: { turma: { select: { formadorId: true } } },
  });
}

function podeVer(
  user: { id?: string; role?: string },
  participacao: { acompanhadorId: string | null; turma: { formadorId: string | null } },
): boolean {
  return podeVerAcompanhamento(user, { acompanhadorId: participacao.acompanhadorId, turmaFormadorId: participacao.turma.formadorId });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireVocacionalAccess({ minPapel: "formador_comunitario" });
  if ("error" in guard) return guard.error;
  const { user, organizacaoId } = guard.access;
  const { id } = await params;

  try {
    const participacao = await carregarContexto(id, organizacaoId);
    if (!participacao) return NextResponse.json({ error: "Participação não encontrada" }, { status: 404 });
    if (!podeVer(user, participacao)) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    // Foro íntimo: a leitura das anotações de direção espiritual é rastreada
    // (LGPD + canônico) — registramos "quem leu", além de quem escreve (POST).
    logAction("vocacional_acompanhamento_lido", user.id, getClientIp(request), { participacaoId: id, papel: user.role }, organizacaoId);

    const notas = await prisma.acompanhamentoVocacional.findMany({
      where: { participacaoId: id, organizacaoId },
      orderBy: { data: "desc" },
      include: { acompanhador: { select: { nome: true } } },
    });

    return NextResponse.json(
      notas.map((n) => ({
        id: n.id,
        data: n.data.toISOString(),
        tipo: n.tipo,
        acompanhadorNome: n.acompanhador.nome,
        solicitadoPeloVocacionado: n.solicitadoPeloVocacionado,
        anotacaoEvolucao: decryptField(n.anotacaoEvolucao),
      })),
    );
  } catch (err) {
    logError("vocacional acompanhamento GET", err);
    return NextResponse.json({ error: "Falha ao carregar acompanhamento" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireVocacionalAccess({ minPapel: "formador_comunitario" });
  if ("error" in guard) return guard.error;
  const { user, organizacaoId } = guard.access;
  const { id } = await params;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const participacao = await carregarContexto(id, organizacaoId);
    if (!participacao) return NextResponse.json({ error: "Participação não encontrada" }, { status: 404 });
    if (!podeVer(user, participacao)) return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });

    const parsed = parseBody(CreateAcompanhamentoVocacionalSchema, await request.json());
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    const nota = await prisma.acompanhamentoVocacional.create({
      data: {
        organizacaoId,
        participacaoId: id,
        acompanhadorId: user.id!,
        data: body.data ? parseDataLocal(body.data) : new Date(),
        tipo: body.tipo ?? "mensal",
        solicitadoPeloVocacionado: body.solicitadoPeloVocacionado ?? false,
        anotacaoEvolucao: encryptField(body.anotacaoEvolucao),
      },
    });

    logAction("vocacional_acompanhamento_registrado", user.id, getClientIp(request), { participacaoId: id, notaId: nota.id }, organizacaoId);
    return NextResponse.json({ id: nota.id }, { status: 201 });
  } catch (err) {
    logError("vocacional acompanhamento POST", err);
    return NextResponse.json({ error: "Falha ao registrar acompanhamento" }, { status: 500 });
  }
}
