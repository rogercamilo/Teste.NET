import { NextResponse } from "next/server";
import { logAction, logError, getClientIp } from "@/lib/audit-log";
import { limiters } from "@/lib/rate-limit";
import { CreateLeituraSchema, parseJson } from "@/lib/schemas";
import { listLeituras, createLeitura } from "@/lib/leituras-store";
import { requireGrupoLeituraAccess } from "./access";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireGrupoLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { organizacaoId, turmaId } = guard.access;

  try {
    return NextResponse.json(await listLeituras(turmaId, organizacaoId));
  } catch (err) {
    logError("grupo leituras GET", err);
    return NextResponse.json({ error: "Falha ao carregar leituras" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const guard = await requireGrupoLeituraAccess(id);
  if ("error" in guard) return guard.error;
  const { user, organizacaoId, turmaId } = guard.access;

  const rl = await limiters.mutation(user.id ?? getClientIp(request));
  if (!rl.allowed) return NextResponse.json({ error: "Muitas requisições. Aguarde antes de tentar novamente." }, { status: 429 });

  try {
    const parsed = await parseJson(request, CreateLeituraSchema);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const { titulo, autor, capaUrl, capitulos } = parsed.data;

    const leitura = await createLeitura(turmaId, organizacaoId, { titulo, autor, capaUrl, capitulos });

    logAction("grupo_leitura_criada", user.id, getClientIp(request), { grupoId: turmaId, leituraId: leitura.id, titulo, capitulos: capitulos.length }, organizacaoId);
    return NextResponse.json(leitura, { status: 201 });
  } catch (err) {
    logError("grupo leituras POST", err);
    return NextResponse.json({ error: "Falha ao cadastrar leitura" }, { status: 500 });
  }
}
