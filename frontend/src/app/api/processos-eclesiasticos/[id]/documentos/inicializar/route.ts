import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import type { SessionUser } from "@/lib/auth-helpers";
import { getDocumentosTipos, eraMenorDeIdade } from "@/lib/jornada-vocacional";

type RouteCtx = { params: Promise<{ id: string }> };

// Materializa a lista de DocumentoEclesiastico de um processo que ficou sem ela
// (ex.: processo criado direto em andamento por seed/importação). Idempotente:
// se já houver documentos, não recria. Espelha a criação feita ao "iniciar".
export async function POST(req: NextRequest, { params }: RouteCtx) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const { organizacaoId } = user;

  try {
    const { id } = await params;
    const processo = await prisma.processoEclesiastico.findFirst({
      where: { id, organizacaoId },
      include: {
        formando: { select: { dataNascimento: true, grupoFormacaoId: true } },
        documentos: { select: { id: true } },
      },
    });
    if (!processo) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });

    // Mesma regra de quem prepara: gestão, ou o formador comunitário da morada.
    const ehPreparador =
      user.role === "administrador" ||
      user.role === "formador_geral" ||
      (user.role === "formador_comunitario" && processo.formando.grupoFormacaoId === user.grupoFormacaoId);
    if (!ehPreparador) {
      return NextResponse.json({ error: "Sem permissão para preparar este processo" }, { status: 403 });
    }

    // Só faz sentido enquanto o processo está em preparação/tramitação ativa.
    const statusAtivos = ["em_andamento", "em_revisao", "aprovado"];
    if (!statusAtivos.includes(processo.status)) {
      return NextResponse.json(
        { error: "A lista de documentos só pode ser criada com o processo em andamento." },
        { status: 422 }
      );
    }
    if (processo.documentos.length > 0) {
      return NextResponse.json({ error: "Este processo já tem documentos." }, { status: 409 });
    }
    if (!processo.formando.dataNascimento) {
      return NextResponse.json(
        { error: "Complete a data de nascimento do formando (no cadastro ou pelo portal) antes de criar os documentos." },
        { status: 422 }
      );
    }

    const menorDeIdade = eraMenorDeIdade(processo.formando.dataNascimento, processo.criadoEm);
    const tiposDoc = getDocumentosTipos(processo.tipo, {
      menorDeIdade,
      favoravelRenovacao: processo.favoravelRenovacao ?? false,
    });

    await prisma.$transaction(async (tx) => {
      const atual = await tx.processoEclesiastico.findFirst({
        where: { id, organizacaoId },
        select: { documentos: { select: { id: true } } },
      });
      if (!atual || atual.documentos.length > 0) return; // corrida: outro pedido já criou
      for (const tipo of tiposDoc) {
        await tx.documentoEclesiastico.create({ data: { processoId: id, tipo, status: "pendente" } });
      }
    });

    const documentos = await prisma.documentoEclesiastico.findMany({
      where: { processoId: id },
      orderBy: { criadoEm: "asc" },
    });

    logAction("processo_eclesiastico_atualizado", user.id, getClientIp(req), { id, acao: "documentos_inicializados" }, organizacaoId);

    return NextResponse.json({
      documentos: documentos.map((d) => ({
        id: d.id,
        processoId: d.processoId,
        tipo: d.tipo,
        status: d.status,
        versao: d.versao,
        arquivoId: d.arquivoId,
        geradoEm: d.geradoEm?.toISOString() ?? null,
        geradoPorId: d.geradoPorId ?? null,
        observacoes: d.observacoes ?? null,
        criadoEm: d.criadoEm.toISOString(),
      })),
    });
  } catch (err) {
    logError("processos-eclesiasticos inicializar", err);
    return NextResponse.json({ error: "Falha ao criar a lista de documentos" }, { status: 500 });
  }
}
