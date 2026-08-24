import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId, parseJson, LiberarRetiroMaterialSchema } from "@/lib/schemas";
import { isGestao, type SessionUser } from "@/lib/auth-helpers";
import { temPermissao } from "@/types";

type Params = { params: Promise<{ id: string }> };

/**
 * Libera/recolhe o MATERIAL DO FORMANDO de um retiro (comunitário ou pessoal) PARA UM GRUPO.
 * A existência de RetiroMaterialLiberacao(retiro, grupo) = liberado. O escopo é
 * por grupo (a grade é compartilhada por vários grupos); por isso a chave é o
 * grupo, não o plano. Autoriza: gestão (FG/FP/admin) OU o FC responsável pelo
 * grupo. Valida por ponte de dados que o retiro pertence ao plano do grupo e
 * que tem material do formando anexado (não libera retiro sem arquivo).
 */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  if (!user?.organizacaoId || !user.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!temPermissao(user.role, "formador_comunitario")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const grupo = await prisma.grupoFormacao.findFirst({
      where: { id, organizacaoId: user.organizacaoId },
      select: { id: true, formadorId: true, planoId: true },
    });
    if (!grupo) return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });

    const ehFormadorDoGrupo = grupo.formadorId === user.id || user.grupoFormacaoId === grupo.id;
    if (!isGestao(user.role) && !ehFormadorDoGrupo) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const parsed = await parseJson(request, LiberarRetiroMaterialSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { retiroPlanoId, liberado } = parsed.data;

    // Ponte: o retiro é do plano deste grupo E tem material do formando.
    const retiro = await prisma.retiroPlano.findFirst({
      where: { id: retiroPlanoId, planoId: grupo.planoId ?? "__none__" },
      select: { id: true, materialFormandoAnexoId: true },
    });
    if (!retiro) return NextResponse.json({ error: "Retiro não pertence ao plano do grupo" }, { status: 404 });
    if (liberado && !retiro.materialFormandoAnexoId) {
      return NextResponse.json({ error: "Este retiro não tem material do formando para liberar" }, { status: 400 });
    }

    if (liberado) {
      await prisma.retiroMaterialLiberacao.upsert({
        where: { retiroPlanoId_grupoFormacaoId: { retiroPlanoId, grupoFormacaoId: id } },
        create: { organizacaoId: user.organizacaoId, retiroPlanoId, grupoFormacaoId: id, liberadoPor: user.id },
        update: { liberadoEm: new Date(), liberadoPor: user.id },
      });
    } else {
      await prisma.retiroMaterialLiberacao.deleteMany({ where: { retiroPlanoId, grupoFormacaoId: id } });
    }

    logAction(
      liberado ? "retiro_material_liberado" : "retiro_material_recolhido",
      user.id,
      getClientIp(request),
      { grupoId: id, retiroPlanoId },
      user.organizacaoId,
    );

    return NextResponse.json({ retiroPlanoId, liberado });
  } catch (err) {
    logError("grupos-formacao/[id]/liberar-retiro", err);
    return NextResponse.json({ error: "Falha ao atualizar liberação" }, { status: 500 });
  }
}
