import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp, logError } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isAdmin, SessionUser as SU } from "@/lib/auth-helpers";
import { toMorada } from "@/lib/converters";
import { isValidId } from "@/lib/schemas";
import type { NivelFormativo } from "@/types";

type Params = { params: Promise<{ id: string }> };

const NIVEL_SEQUENCE: NivelFormativo[] = [
  "pre-discipulado",
  "discipulado",
  "primeiras-promessas",
  "formacao-permanente",
];

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const isFC = user.role === "formador_comunitario";
  if (!isAdmin(user.role) && !isFC) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  try {
    const morada = await prisma.morada.findFirst({ where: { id, organizacaoId: user.organizacaoId } });
    if (!morada) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (isFC && (user as { moradaId?: string | null }).moradaId !== id) {
      return NextResponse.json({ error: "Sem permissão para avançar esta etapa" }, { status: 403 });
    }
    if (!morada.vigenciaFim) {
      return NextResponse.json({ error: "A etapa atual ainda não foi encerrada" }, { status: 409 });
    }

    const currentIdx = NIVEL_SEQUENCE.indexOf(morada.nivelFormativo as NivelFormativo);
    if (currentIdx < 0 || currentIdx >= NIVEL_SEQUENCE.length - 1) {
      return NextResponse.json({ error: "Não há próxima etapa disponível" }, { status: 409 });
    }
    const nextNivel = NIVEL_SEQUENCE[currentIdx + 1];

    const body = await request.json().catch(() => ({})) as { vigenciaInicio?: string };
    const vigenciaInicio = body.vigenciaInicio ? new Date(body.vigenciaInicio) : new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const moradaAtualizada = await tx.morada.update({
        where: { id },
        data: { nivelFormativo: nextNivel, vigenciaInicio, vigenciaFim: null },
      });

      // Avançar formandos para a nova etapa
      const formandos = await tx.formando.findMany({
        where: { moradaId: id, organizacaoId: user.organizacaoId! },
        select: { id: true },
      });

      for (const formando of formandos) {
        await tx.formando.update({
          where: { id: formando.id },
          data: { nivelFormativo: nextNivel },
        });
        await tx.progressoEtapa.upsert({
          where: { formandoId_nivelFormativo: { formandoId: formando.id, nivelFormativo: nextNivel } },
          update: { iniciouEm: vigenciaInicio },
          create: {
            formandoId: formando.id,
            nivelFormativo: nextNivel,
            iniciouEm: vigenciaInicio,
          },
        });
      }

      return moradaAtualizada;
    });

    logAction("morada_nova_etapa", user.id, getClientIp(request), { id, nivelFormativo: nextNivel }, user.organizacaoId);
    return NextResponse.json(toMorada(updated));
  } catch (err) {
    logError("moradas/[id]/nova-etapa POST", err);
    return NextResponse.json({ error: "Falha ao iniciar nova etapa" }, { status: 500 });
  }
}
