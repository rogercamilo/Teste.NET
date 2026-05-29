import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";

type SU = { id?: string; role?: string; organizacaoId?: string };
type Params = { params: Promise<{ id: string }> };

function isAdmin(role?: string) { return role === "administrador" || role === "formador_geral"; }

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const rl = await limiters.mutation(user.id ?? "unknown");
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  const { id } = await params;

  const original = await prisma.planoFormativo.findFirst({
    where: { id, OR: [{ isGlobal: true }, { organizacaoId: user.organizacaoId }] },
    include: { eixos: true },
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
            objetivo: e.objetivo,
            intervaloEncontros: e.intervaloEncontros,
            cargaHoraria: e.cargaHoraria,
            areaFormacao: e.areaFormacao,
          })),
        },
      },
      include: { eixos: true },
    });
  });

  logAction("plano_created", user.id, getClientIp(request), { clonedFrom: id, cloneId: clone.id }, user.organizacaoId);
  return NextResponse.json({ id: clone.id, nome: clone.nome }, { status: 201 });
}
