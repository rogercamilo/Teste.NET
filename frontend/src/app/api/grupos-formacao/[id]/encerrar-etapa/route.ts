import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isGestao, SessionUser as SU } from "@/lib/auth-helpers";
import { toGrupoFormacao } from "@/lib/converters";
import { isValidId } from "@/lib/schemas";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const isFC = user.role === "formador_comunitario";
  if (!isGestao(user.role) && !isFC) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const grupoFormacao = await prisma.grupoFormacao.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!grupoFormacao) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (grupoFormacao.tipo !== "estruturado") {
      return NextResponse.json({ error: "Operação não aplicável a grupos livres" }, { status: 400 });
    }
    const nivelFormativoStr: string = grupoFormacao.nivelFormativo!;
    if (isFC && (user as { grupoFormacaoId?: string | null }).grupoFormacaoId !== id) {
      return NextResponse.json({ error: "Sem permissão para encerrar esta etapa" }, { status: 403 });
    }
    if (grupoFormacao.vigenciaFim) {
      return NextResponse.json({ error: "A etapa já foi encerrada" }, { status: 409 });
    }

    const body = await request.json().catch(() => ({})) as { encerradoEm?: string };
    const encerradoEm = body.encerradoEm ? new Date(body.encerradoEm) : new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const moradaAtualizada = await tx.grupoFormacao.update({
        where: { id },
        data: { vigenciaFim: encerradoEm },
      });

      // Registrar concluiuEm nos formandos ativos da morada para o nivel atual
      const formandos = await tx.formando.findMany({
        where: { grupoFormacaoId: id, organizacaoId: user.organizacaoId!, deletedAt: null },
        select: { id: true },
      });

      await Promise.all(
        formandos.map((formando) =>
          tx.progressoEtapa.upsert({
            where: { formandoId_nivelFormativo: { formandoId: formando.id, nivelFormativo: nivelFormativoStr } },
            update: { concluiuEm: encerradoEm },
            create: { formandoId: formando.id, nivelFormativo: nivelFormativoStr, concluiuEm: encerradoEm },
          })
        )
      );

      return moradaAtualizada;
    });

    logAction("grupo_formacao_etapa_encerrada", user.id, getClientIp(request), { id, nivelFormativo: nivelFormativoStr }, user.organizacaoId);
    return NextResponse.json(toGrupoFormacao(updated));
  } catch (err) {
    logError("moradas/[id]/encerrar-etapa POST", err);
    return NextResponse.json({ error: "Falha ao encerrar etapa" }, { status: 500 });
  }
}
