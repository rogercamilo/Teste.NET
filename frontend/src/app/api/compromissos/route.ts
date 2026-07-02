import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { CreateCompromissoSchema, parseJson } from "@/lib/schemas";
import { limiters } from "@/lib/rate-limit";
import { SessionUser as SU } from "@/lib/auth-helpers";
import { toCompromisso } from "@/lib/converters";

// Agenda pessoal do formador (item 1.5): compromissos são PRIVADOS —
// cada usuário vê e gerencia apenas os seus (formadorId = user.id).

export async function GET() {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const rows = await prisma.compromisso.findMany({
      where: { organizacaoId: user.organizacaoId, formadorId: user.id },
      orderBy: { dataInicio: "asc" },
    });
    return NextResponse.json(rows.map(toCompromisso));
  } catch (err) {
    logError("compromissos GET", err);
    return NextResponse.json({ error: "Falha ao carregar compromissos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user as SU | undefined;
  if (!user?.organizacaoId || !user.id) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const rl = await limiters.mutation(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });
  }

  try {
    const parsed = await parseJson(request, CreateCompromissoSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const body = parsed.data;

    // Vínculo opcional a formando — precisa ser da mesma org; resolve o nome.
    let formandoId: string | null = null;
    let formandoNome: string | null = null;
    if (body.formandoId) {
      const formando = await prisma.formando.findFirst({
        where: { id: body.formandoId, organizacaoId: user.organizacaoId, deletedAt: null },
        select: { id: true, nome: true },
      });
      if (!formando) return NextResponse.json({ error: "Formando não encontrado" }, { status: 404 });
      formandoId = formando.id;
      formandoNome = formando.nome;
    }

    const row = await prisma.compromisso.create({
      data: {
        organizacaoId: user.organizacaoId,
        formadorId: user.id,
        titulo: body.titulo,
        descricao: body.descricao || null,
        tipo: body.tipo,
        dataInicio: new Date(body.dataInicio),
        dataFim: new Date(body.dataFim ?? body.dataInicio),
        local: body.local || null,
        linkOnline: body.linkOnline || null,
        formandoId,
        formandoNome,
      },
    });
    logAction("compromisso_created", user.id, getClientIp(request), { id: row.id }, user.organizacaoId);
    return NextResponse.json(toCompromisso(row), { status: 201 });
  } catch (err) {
    logError("compromissos POST", err);
    return NextResponse.json({ error: "Falha ao criar compromisso" }, { status: 500 });
  }
}
