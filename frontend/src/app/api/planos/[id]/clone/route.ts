import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { isValidId } from "@/lib/schemas";

import { podeElaborarConteudo, SessionUser as SU } from "@/lib/auth-helpers";
type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!podeElaborarConteudo(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  const { id } = await params;
  if (!isValidId(id)) return Response.json({ error: "Não encontrado" }, { status: 404 });

  const original = await prisma.planoFormativo.findFirst({
    where: { id, OR: [{ isGlobal: true }, { organizacaoId: user.organizacaoId }] },
    include: { eixos: true, retiros: true },
  });

  if (!original) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

  const clone = await prisma.$transaction(async (tx) => {
    return tx.planoFormativo.create({
      data: {
        organizacaoId: user.organizacaoId!,
        isGlobal: false,
        nome: `${original.nome} (cópia)`,
        objetivos: original.objetivos,
        fundamentacao: original.fundamentacao,
        nivelFormativo: original.nivelFormativo,
        vigenciaInicio: original.vigenciaInicio,
        vigenciaFim: original.vigenciaFim,
        status: "rascunho",
        eixos: {
          create: original.eixos.map((e) => ({
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
          create: original.retiros.map((r) => ({
            tipo: r.tipo,
            numero: r.numero,
            tema: r.tema,
            trechoBiblico: r.trechoBiblico || null,
            objetivo: r.objetivo,
            quandoRealizar: r.quandoRealizar,
            cargaHoraria: r.cargaHoraria,
            materialAnexo: r.materialAnexo || null,
            materialAnexoId: r.materialAnexoId || null,
            materialFormandoAnexo: r.materialFormandoAnexo || null,
            materialFormandoAnexoId: r.materialFormandoAnexoId || null,
          })),
        },
      },
      include: { eixos: true, retiros: true },
    });
  });

  logAction("plano_created", user.id, getClientIp(request), { clonedFrom: id, cloneId: clone.id }, user.organizacaoId);
  return NextResponse.json({ id: clone.id, nome: clone.nome }, { status: 201 });
}
