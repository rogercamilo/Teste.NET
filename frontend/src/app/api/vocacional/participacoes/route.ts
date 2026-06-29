import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { CreateParticipacaoVocacionalSchema, parseBody } from "@/lib/schemas";
import { isGestao } from "@/lib/auth-helpers";
import { lavrarTermo, parseDataLocal, LivroError } from "@/lib/livro-registro";
import { lavrarComRetry, isP2002, p2002Target } from "@/lib/livro-retry";
import { validarElegibilidadeVocacional, STATUS_EM_ANDAMENTO } from "@/lib/vocacional-rules";
import { parsePagination, paginationHeaders } from "@/lib/pagination";
import { requireVocacionalAccess } from "../guard";

export async function GET(request: Request) {
  const guard = await requireVocacionalAccess({ minPapel: "formador_comunitario" });
  if ("error" in guard) return guard.error;
  const { organizacaoId } = guard.access;

  const searchParams = new URL(request.url).searchParams;
  const turmaId = searchParams.get("turmaId");
  const q = searchParams.get("q")?.trim();
  try {
    const where = {
      organizacaoId,
      ...(turmaId ? { turmaId } : {}),
      // Busca server-side por nome do formando (typeahead em orgs grandes).
      ...(q ? { formando: { is: { nome: { contains: q, mode: "insensitive" as const } } } } : {}),
    };
    const include = {
      formando: { select: { id: true, nome: true, condicaoAtual: true } },
      acompanhador: { select: { id: true, nome: true } },
    };
    const orderBy = { criadoEm: "desc" as const };

    // Sem page/pageSize → mantém o comportamento "retorna tudo" dos callers atuais.
    const pagination = parsePagination(searchParams);
    if (!pagination) {
      const participacoes = await prisma.participacaoVocacional.findMany({ where, orderBy, include });
      return NextResponse.json(participacoes);
    }

    const [participacoes, total] = await Promise.all([
      prisma.participacaoVocacional.findMany({ where, orderBy, include, skip: pagination.skip, take: pagination.take }),
      prisma.participacaoVocacional.count({ where }),
    ]);
    return NextResponse.json(participacoes, { headers: paginationHeaders(total, pagination) });
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

    // Elegibilidade: vocacional é para membros NÃO formais e sem participação ativa.
    const emAndamento = await prisma.participacaoVocacional.findFirst({
      where: { formandoId: formando.id, organizacaoId, status: { in: [...STATUS_EM_ANDAMENTO] } },
      select: { id: true },
    });
    const elegivel = validarElegibilidadeVocacional({
      condicaoAtual: formando.condicaoAtual,
      temParticipacaoEmAndamento: !!emAndamento,
    });
    if (!elegivel.ok) return NextResponse.json({ error: elegivel.motivo }, { status: 409 });

    const dataIngresso = body.dataIngresso ? parseDataLocal(body.dataIngresso) : new Date();

    // Lavra o termo de ingresso no Livro e cria a participação na mesma transação.
    // O retry em P2002 (colisão de numeração do termo) fica no helper; a colisão
    // de `formandoId` é permanente (não retenta) → propaga e vira 409 específico.
    let participacaoId: string;
    try {
      participacaoId = await lavrarComRetry(
        async (tx) => {
          const participacao = await tx.participacaoVocacional.create({
            data: {
              organizacaoId,
              formandoId: formando.id,
              turmaId: turma.id,
              status: "ativa",
              dataIngresso,
              acompanhadorId: body.acompanhadorId || turma.formadorId || null,
              // Captura o pré-estado para reversão não-destrutiva (recusa/cancelamento).
              grupoOrigemId: formando.grupoFormacaoId,
              condicaoOrigem: formando.condicaoAtual,
            },
          });
          // Durante o vocacional, o formando passa a ser acompanhado pela turma.
          await tx.formando.update({
            where: { id: formando.id },
            data: { grupoFormacaoId: turma.id, condicaoAtual: "candidato" },
          });
          const termo = await lavrarTermo(tx, {
            organizacaoId,
            tipo: "ingresso_vocacional",
            formandoId: formando.id,
            dataEvento: dataIngresso,
            contexto: { formandoNome: formando.nome, dataEvento: dataIngresso },
            criadoPorId: user.id,
            lavradoAutomaticamente: true,
          });
          // Liga o termo de ingresso à participação (referência da retificação no cancelamento).
          await tx.participacaoVocacional.update({
            where: { id: participacao.id },
            data: { termoIngressoId: termo.id },
          });
          return participacao.id;
        },
        { naoRetentar: (e) => p2002Target(e).includes("formandoId") },
      );
    } catch (e) {
      if (e instanceof LivroError) {
        return NextResponse.json(
          { error: "Abra um tomo do Livro de Registro antes de inscrever vocacionados." },
          { status: 409 },
        );
      }
      if (isP2002(e) && p2002Target(e).includes("formandoId")) {
        return NextResponse.json({ error: "Este formando já participa desta turma." }, { status: 409 });
      }
      throw e;
    }

    logAction("vocacional_participacao_criada", user.id, getClientIp(request), { participacaoId, turmaId, formandoId: formando.id }, organizacaoId);
    return NextResponse.json({ id: participacaoId }, { status: 201 });
  } catch (err) {
    logError("vocacional participacoes POST", err);
    return NextResponse.json({ error: "Falha ao inscrever vocacionado" }, { status: 500 });
  }
}
