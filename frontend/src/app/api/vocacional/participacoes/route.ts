import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { CreateParticipacaoVocacionalSchema, parseBody } from "@/lib/schemas";
import { isGestao } from "@/lib/auth-helpers";
import { lavrarTermo, parseDataLocal, LivroError } from "@/lib/livro-registro";
import { requireVocacionalAccess } from "../guard";

export async function GET(request: Request) {
  const guard = await requireVocacionalAccess({ minPapel: "formador_comunitario" });
  if ("error" in guard) return guard.error;
  const { organizacaoId } = guard.access;

  const turmaId = new URL(request.url).searchParams.get("turmaId");
  try {
    const participacoes = await prisma.participacaoVocacional.findMany({
      where: { organizacaoId, ...(turmaId ? { turmaId } : {}) },
      orderBy: { criadoEm: "desc" },
      include: {
        formando: { select: { id: true, nome: true, condicaoAtual: true } },
        acompanhador: { select: { id: true, nome: true } },
      },
    });
    return NextResponse.json(participacoes);
  } catch (err) {
    logError("vocacional participacoes GET", err);
    return NextResponse.json({ error: "Falha ao carregar participações" }, { status: 500 });
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
    const raw = (await request.json()) as Record<string, unknown>;
    const turmaId = typeof raw.turmaId === "string" ? raw.turmaId : "";
    const parsed = parseBody(CreateParticipacaoVocacionalSchema, raw);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    if (!turmaId) return NextResponse.json({ error: "turmaId obrigatório" }, { status: 400 });
    const body = parsed.data;

    const [turma, formando] = await Promise.all([
      prisma.grupoFormacao.findFirst({ where: { id: turmaId, organizacaoId, tipo: "vocacional" } }),
      prisma.formando.findFirst({ where: { id: body.formandoId, organizacaoId, deletedAt: null } }),
    ]);
    if (!turma) return NextResponse.json({ error: "Turma vocacional não encontrada" }, { status: 404 });
    if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });

    const dataIngresso = body.dataIngresso ? parseDataLocal(body.dataIngresso) : new Date();

    // Lavra o termo de ingresso no Livro e cria a participação na mesma transação.
    // Retry em P2002 cobre a corrida de numeração do termo.
    let participacaoId = "";
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        participacaoId = await prisma.$transaction(async (tx) => {
          const participacao = await tx.participacaoVocacional.create({
            data: {
              organizacaoId,
              formandoId: formando.id,
              turmaId: turma.id,
              status: "ativa",
              dataIngresso,
              acompanhadorId: body.acompanhadorId || turma.formadorId || null,
            },
          });
          // Durante o vocacional, o formando passa a ser acompanhado pela turma.
          await tx.formando.update({
            where: { id: formando.id },
            data: { grupoFormacaoId: turma.id, condicaoAtual: "candidato" },
          });
          await lavrarTermo(tx, {
            organizacaoId,
            tipo: "ingresso_vocacional",
            formandoId: formando.id,
            dataEvento: dataIngresso,
            contexto: { formandoNome: formando.nome, dataEvento: dataIngresso },
            criadoPorId: user.id,
            lavradoAutomaticamente: true,
          });
          return participacao.id;
        });
        break;
      } catch (e) {
        if (e instanceof LivroError) {
          return NextResponse.json(
            { error: "Abra um tomo do Livro de Registro antes de inscrever vocacionados." },
            { status: 409 },
          );
        }
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === "P2002" && Array.isArray(e.meta?.target) && (e.meta.target as string[]).includes("formandoId")) {
            return NextResponse.json({ error: "Este formando já participa desta turma." }, { status: 409 });
          }
          if (e.code === "P2002" && attempt < 3) continue; // colisão de numeração do termo
        }
        throw e;
      }
    }

    if (!participacaoId) {
      return NextResponse.json({ error: "Falha ao lavrar o termo de ingresso. Tente novamente." }, { status: 409 });
    }

    logAction("vocacional_participacao_criada", user.id, getClientIp(request), { participacaoId, turmaId, formandoId: formando.id }, organizacaoId);
    return NextResponse.json({ id: participacaoId }, { status: 201 });
  } catch (err) {
    logError("vocacional participacoes POST", err);
    return NextResponse.json({ error: "Falha ao inscrever vocacionado" }, { status: 500 });
  }
}
